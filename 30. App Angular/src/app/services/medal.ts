import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type Table = {
  tableid: number;
  schemaname: string;
  tablename:string;
  medallionid: number;
  medallion: string;
};

export type Column = {
  columnid: number;
  schemaname: string;
  tablename:string;
  columnname: string;
  columnnull: string;
  columnkey: string;
  columntype: string;
  columnmax: number;
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
};

export type medallion = {
  medallionid: number;
  medallion: string;
}

interface TestResponse {
  ok: boolean;
}
export type Profile = { profileid: number; profilename: string };

@Injectable({ providedIn: 'root' })
export class medalService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}


  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.api}/connections`, );
  }

  getTables(connectionid?: number): Observable<Table[]> {
    let params = new HttpParams();
    if (connectionid != null) {
      params = params.set('connectionid', connectionid.toString());
    }

    return this.http.get<Table[]>(`${this.api}/tables`, {params} );
  }

  getColumns(tableid?: number): Observable<Column[]> {
    return this.http.get<Column[]>(`${this.api}/tables/${tableid}/columns`, {} );
  }

  getMedallions(): Observable<medallion[]> {
    return this.http.get<medallion[]>(`${this.api}/medallions`, );
  }

  updateTableMedallion(tableid?: number, medallionid?: null | number): Observable<void> {

    return this.http.put<void>(`${this.api}/tables/${tableid}/medallion/${medallionid}`, {});

  }

}
