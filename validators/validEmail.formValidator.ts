import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * @description Función que valida si el campo es un email válido
 * @usageNotes
 *
 * ### Validar un campo con un email válido
 *
 * ```ts
 * const emailControl = new FormControl('bad@', Validators.pattern(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
 * console.log(emailControl.errors); // {pattern: true}
 * ```
 *
 * @returns ValidatorFn
 */
export function emailPatternValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValid = emailPattern.test(control.value);
    return isValid ? null : { invalidEmail: true };
  };
}
