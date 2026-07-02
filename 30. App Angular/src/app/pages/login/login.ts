import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [FormsModule, NgIf]
})
export class Login {
  userid = '';
  password = '';
  errorMsg = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async login() {
    this.errorMsg = '';
    this.loading = true;

    try {
      const ok = await this.auth.login(this.userid, this.password);



      if (ok) {

        await this.router.navigate(['/home']);
        return;
      }

      this.errorMsg = 'Usuario o contraseña incorrectos';

    } catch (err: any) {
      console.error(err);
      this.errorMsg = 'Error de conexión con el servidor';

    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}

