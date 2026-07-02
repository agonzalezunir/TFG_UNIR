import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { LoginResponse, UserProfile, NavItem } from '../models/auth.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private api = environment.apiUrl;

  private tokenKey = 'token';
  private profile$ = new BehaviorSubject<UserProfile | null>(null);
  private nav$ = new BehaviorSubject<NavItem[]>([]);

  profileChanges = this.profile$.asObservable();
  navChanges = this.nav$.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Rehidratar sesión si hay token
    const token = this.getToken();
    if (token) {
      this.refreshSession().catch(() => this.logout());
    }
  }

  async login(user: string, password: string): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.api}/login`, { user, password}, {})
    );

    if (res.status !== 'ok' || !res.token) return false;
    localStorage.setItem(this.tokenKey, res.token);
    await this.refreshSession();
    return true;
  }

  async refreshSession(): Promise<void> {
    // Cargar perfil + navegación (o permisos) tras login/recarga
    const [profile, nav] = await Promise.all([
      firstValueFrom(this.http.get<UserProfile>(`${this.api}/me`)),
      firstValueFrom(this.http.get<NavItem[]>(`${this.api}/me/nav`)),
    ]);

    this.profile$.next(profile);
    this.nav$.next(nav);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.profile$.next(null);
    this.nav$.next([]);
    this.router.navigate(['']);
  }

  isAuthenticated(): boolean {
    //return true
    return !!this.getToken() && !!this.profile$.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getProfileSnapshot(): UserProfile | null {
    return this.profile$.value;
  }

  getNavSnapshot(): NavItem[] {
    return this.nav$.value;
  }

  getProfileId(): number | undefined {
    return this.profile$.value?.userid
  }

  isAdmin(): boolean | undefined{
    return this.profile$.value?.isadmin
  }

  getUserName(): string | undefined {
    return this.profile$.value?.name
  }


}
