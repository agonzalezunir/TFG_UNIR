import { Injectable } from '@angular/core';
import {AuthService} from '../services/auth';
import {Router, UrlTree} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.isAuthenticated()) return true;
    return this.router.createUrlTree(['']);
  }
}
