import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { from, Observable, BehaviorSubject, of, timer, catchError } from "rxjs";
import { map, tap, switchMap } from "rxjs/operators";
import { User, UserResponse } from "@supabase/supabase-js";
import { UserModel } from "../models/user.model";
import { TABLES } from "../enum/schema.enum";
import { DBHelper } from "../helpers/db.helper";
import supabase from "../helpers/supabase-client";

interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  lastname: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private supabase = supabase;
  private dbHelper = inject(DBHelper);
  private authState$ = new BehaviorSubject<boolean>(false);
  private currentUser$ = new BehaviorSubject<UserModel | null>(null);
  private sessionEstablished = false;

  constructor() {
    this.initAuthState();
    this.initCurrentUser();
  }

  private initAuthState() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.authState$.next(!!session);
    });
  }

  isAuthenticated(): Observable<boolean> {
    return from(this.supabase.auth.getSession()).pipe(
      map(({ data: { session } }) => !!session)
    );
  }

  // Método privado para inicializar el usuario actual
  private async initCurrentUser(): Promise<void> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (session?.user) {
        try {
          const userData = await this.dbHelper.getDocumentById({
            collection: TABLES.USERS,
            id: session.user.id,
          });
          this.sessionEstablished = true;
          this.currentUser$.next(userData as unknown as UserModel);
        } catch (error) {
          console.error("Error getting user data:", error);
          this.currentUser$.next(null);
        }
      } else {
        this.currentUser$.next(null);
      }
    } catch (error) {
      console.error("Error initializing user:", error);
      this.currentUser$.next(null);
    }
  }

  // Método para iniciar sesión
  login(email: string, password: string): Observable<User | null> {
    return from(
      this.supabase.auth.signInWithPassword({ email, password })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data.user;
      })
    );
  }

  // Método para registrarse
  register({
    username,
    email,
    password,
    name,
    lastname,
  }: RegisterData): Observable<User | null> {
    return from(this.supabase.auth.signUp({ email, password })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const user = data.user;
        if (!user) return of(null);

        const userData: UserModel = {
          last_name: lastname,
          id: user.id,
          name,
          email: user.email || "",
          username,
          created_at: Date.now(),
          role_id: "", // Establecer rol por defecto
          // Añadir cualquier otro campo requerido por UserModel con valores por defecto
        };

        return from(
          this.dbHelper.createDocument({
            collection: TABLES.USERS,
            data: userData,
          })
        ).pipe(
          tap((createdUser) => {
            this.sessionEstablished = true;
            this.currentUser$.next(createdUser);
          }),
          map(() => user)
        );
      })
    );
  }

  // Update logout method to use the service's method
  logout(): Observable<any> {
    return from(this.supabase.auth.signOut()).pipe(
      tap(() => {
        this.currentUser$.next(null);
        this.authState$.next(false);
      })
    );
  }

  // Método para obtener el usuario actual
  getCurrentUser(): Observable<UserModel | null> {
    return this.currentUser$.pipe(
      switchMap((user) => {
        // Si ya tenemos un usuario, lo retornamos inmediatamente
        if (user) {
          return of(user);
        }

        // Si la sesión ya está establecida y no hay usuario, retornamos null
        if (this.sessionEstablished) {
          return of(null);
        }

        // Solo intentamos obtener la sesión si no está establecida
        return from(this.supabase.auth.getSession()).pipe(
          switchMap(({ data: { session } }) => {
            if (!session?.user) {
              this.sessionEstablished = true;
              return of(null);
            }

            // Usar el nuevo método Observable
            return this.dbHelper
              .getDocumentById$({
                collection: TABLES.USERS,
                id: session.user.id,
              })
              .pipe(
                tap((userData) => {
                  this.sessionEstablished = true;
                  this.currentUser$.next(userData);
                })
              );
          })
        );
      })
    );
  }

  // Nuevo método para forzar actualización
  forceUserUpdate(userId: string): Observable<UserModel | null> {
    return this.dbHelper
      .getDocumentById$({
        collection: TABLES.USERS,
        id: userId,
      })
      .pipe(
        tap((userData) => {
          console.log("Forzando actualización de usuario:", userData);
          this.currentUser$.next(userData);
        }),
        catchError((error) => {
          console.error("Error actualizando usuario:", error);
          return of(null);
        })
      );
  }

  checkUsernameNotTaken(username: string): Promise<boolean> {
    return this.dbHelper
      .getDynamic({
        collection: TABLES.USERS,
        where: [{ field: "username", condition: "==", value: username }],
      })
      .then((users) => users.length === 0);
  }

  checkEmailNotTaken(email: string): Promise<boolean> {
    return this.dbHelper
      .getDynamic({
        collection: TABLES.USERS,
        where: [{ field: "email", condition: "==", value: email }],
      })
      .then((users) => users.length === 0);
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<UserResponse> {
    const session = await this.supabase.auth.getSession();
    const user = session.data.session?.user;

    if (!user?.email) {
      throw new Error("No user session found");
    }

    // Primero intentamos verificar la contraseña actual usando un cliente nuevo
    // Esto no afecta la sesión actual del usuario
    const tempClient = supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    const { error: verificationError } = await tempClient;

    if (verificationError) {
      throw {
        code: "invalid_credentials",
        message: "Current password is incorrect",
      };
    }

    if (currentPassword === newPassword) {
      throw {
        code: "same_password",
        message: "New password must be different from current password",
      };
    }

    // Si todo está bien, procedemos a actualizar la contraseña
    return this.supabase.auth.updateUser({ password: newPassword });
  }
}
