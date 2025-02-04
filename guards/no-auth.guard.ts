import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      map((user) => {
        if (user) {
          // Si el usuario está autenticado, redirigirlo al dashboard
          this.router.navigate(['/pages/dashboard/home']);
          return false;
        } else {
          // Si no está autenticado, permitir el acceso a la página
          return true;
        }
      })
    );
  }
}
