import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export type AppInfo = {
  appname: string;
  appnotes: string;
  apptext: string;
};

@Injectable({ providedIn: 'root' })
export class AppInfoService {

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAppInfo(): Observable<AppInfo> {
    return this.http
      .get<AppInfo>(`${this.api}/appInfo`)
      .pipe(shareReplay(1));
  }
}
