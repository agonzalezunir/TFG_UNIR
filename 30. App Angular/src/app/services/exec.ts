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

export type execHistory = {
  execid: number;
  rulename: string;
  execdate: string;
  execresult: number;
  execstatus: string;
};

interface TestResponse {
  ok: boolean;
}


@Injectable({ providedIn: 'root' })
export class execService {
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

  getAssignedTableRules(tableid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/table/${tableid}/assigned`, );
  }

  getColumns(tableid?: number): Observable<Column[]> {
    return this.http.get<Column[]>(`${this.api}/tables/${tableid}/columns`, {} );
  }

  getAssignedColRules(columnid: number): Observable<rule[]> {
    return this.http.get<rule[]>(`${this.api}/rules/column/${columnid}/assigned`, );
  }

  execColRule(ruleid: number, colid:number): Observable<TestResponse> {
    return this.http.put<TestResponse>(`${this.api}/rules/${ruleid}/execcolumn/${colid}`, {});
  }

  execTableRule(ruleid: number, tableid:number): Observable<TestResponse> {
    return this.http.put<TestResponse>(`${this.api}/rules/${ruleid}/exectable/${tableid}`, {});
  }

  getExecsTable(tableid: number): Observable<execHistory[]> {
    return this.http.get<execHistory[]>(`${this.api}/rules/table/${tableid}/executions`, );
  }

  getExecsCol(colid: number): Observable<execHistory[]> {
    return this.http.get<execHistory[]>(`${this.api}/rules/column/${colid}/executions`, );
  }

}
