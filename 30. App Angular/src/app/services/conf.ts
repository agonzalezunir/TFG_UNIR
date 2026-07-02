import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type User = {
  userid: number;
  username: string;
  name: string;
  profilename: string;
  userstatus: string;
  profileid: number;
  userstatusid: number;
  password: string;
};

export type UserStatus = {
  userstatusid: number;
  userstatus: string;
}

export type UserUpdate = {
  username: string;
  name: string;
  profilename: string;
};

export type Connection = {
  connectionid: number;
  connectionname: string;
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  status: string;
  updated: string;
};

export type ConnectionUpdate = {
  connectionname: string;
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

interface TestResponse {
  ok: boolean;
}
export type Profile = { profileid: number; profilename: string };

@Injectable({ providedIn: 'root' })
export class ConfService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(statusid?: number): Observable<User[]> {
    const params = statusid != null ? { params: { userstatusid: String(statusid) } } : {};
    return this.http.get<User[]>(`${this.api}/users`, params);
  }

  getUsersStatuses(): Observable<UserStatus[]> {
    return this.http.get<UserStatus[]>(`${this.api}/usersStatuses`);
  }

  updateUser(userid: number, payload: UserUpdate): Observable<void> {
    return this.http.put<void>(`${this.api}/users/${userid}`, payload);
  }

  createUser(payload: UserUpdate): Observable<void> {
    return this.http.put<void>(`${this.api}/users`, payload);
  }

  setUserStatus(userid: number, userstatusid: number): Observable<void> {
    return this.http.put<void>(`${this.api}/users/${userid}/status`, { userstatusid });
  }

  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.api}/profiles`);
  }

  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.api}/connections`, );
  }

  createConn(payload: ConnectionUpdate): Observable<void> {

    return this.http.put<void>(`${this.api}/connections`, payload);
  }

  updateConn(connectionid: number, payload: ConnectionUpdate): Observable<void> {

    return this.http.put<void>(`${this.api}/connections/${connectionid}`, payload);
  }

  deleteConn(connectionid: number): Observable<void> {
    return this.http.put<void>(`${this.api}/connections/${connectionid}/delete`, {});
  }

  testConn(connectionid: number): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.api}/connections/${connectionid}/test`, {});
  }

  extractMetadataConn(connectionid: number): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.api}/connections/${connectionid}/extract`, {});
  }



}
