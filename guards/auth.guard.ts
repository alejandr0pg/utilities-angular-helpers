import { inject, Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Observable, from, of } from "rxjs";
import { switchMap, take, filter, map } from "rxjs/operators";
import { UserModel } from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      take(1),
      switchMap((isAuthenticated) => {
        if (!isAuthenticated) {
          this.router.navigate(["/auth/login"]);
          return of(false);
        }

        return this.authService.getCurrentUser().pipe(
          filter((user): user is UserModel | null => user !== undefined),
          take(1),
          map((user) => {
            if (!user) {
              this.router.navigate(["/auth/login"]);
              return false;
            }

            return true;
          })
        );
      })
    );
  }
}
