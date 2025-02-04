import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-singup',
  templateUrl: './singup.page.html',
  styleUrls: ['./singup.page.scss'],
})
export class SingupPage implements OnInit {
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.registerForm = this.fb.group(
      {
        name: ['', Validators.required],
        lastname: ['', Validators.required],
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validator: this.checkPasswords }
    );
  }

  checkPasswords(group: FormGroup) {
    const passwordControl = group.get('password');
    const confirmPasswordControl = group.get('confirmPassword');

    if (!passwordControl || !confirmPasswordControl) {
      return null;
    }

    const password = passwordControl.value;
    const confirmPassword = confirmPasswordControl.value;

    return password === confirmPassword ? null : { notSame: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, username, name, lastname } =
        this.registerForm.value;
      this.authService
        .register({ username, email, password, name, lastname })
        .subscribe({
          next: () => {
            this.router.navigate(['/auth/kyc']);
          },
          error: (err) => {
            console.error('Error al registrarse', err);
          },
        });
    } else {
      console.log('Formulario inválido');
    }
  }
}
