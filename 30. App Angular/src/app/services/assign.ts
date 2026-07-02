import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type rule = {
  ruleid:number;
  rulename: string;
  categoryid: number;
  category: string;
  typeid: number;
  type: string;
  ruletext: string;
  rulestatus: string;
  updated: string;
};

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

@Injectable({ providedIn: 'root' })
export class assignService {
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

  getAvailableTableRules(tableid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/table/${tableid}/available`, );
  }

  getAssignedTableRules(tableid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/table/${tableid}/assigned`, );
  }

  assignToTable(tableid?: number, ruleid?: null | number): Observable<void> {

    return this.http.put<void>(`${this.api}/rules/${ruleid}/assigntotable/${tableid}`, {});

  }

  deassignFromTable(tableid?: number, ruleid?: null | number): Observable<void> {

    return this.http.put<void>(`${this.api}/rules/${ruleid}/deassignfromtable/${tableid}`, {});

  }

  getColumns(tableid?: number): Observable<Column[]> {
    return this.http.get<Column[]>(`${this.api}/tables/${tableid}/columns`, {} );
  }


  getAvailableColRules(columnid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/column/${columnid}/available`, );
  }

  getAssignedColRules(columnid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/column/${columnid}/assigned`, );
  }

  assignToCol(columnid?: number, ruleid?: null | number): Observable<void> {

    return this.http.put<void>(`${this.api}/rules/${ruleid}/assigntocolumn/${columnid}`, {});

  }

  deassignFromCol(columnid?: number, ruleid?: null | number): Observable<void> {

    return this.http.put<void>(`${this.api}/rules/${ruleid}/deassignfromcolumn/${columnid}`, {});

  }




}
