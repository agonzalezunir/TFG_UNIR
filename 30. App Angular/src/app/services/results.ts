import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { category, rule } from './rules';


export type results = {
  categoryid: number,
  category: string,
  medallionid: number,
  medallion: string,
  value: number

};

export type results_hist = {
  categoryid: number,
  category: string,
  medallionid: number,
  medallion: string,
  anio: number,
  mes: number,
  dia: number,
  value: number
};

export type results_exec = {
  medallionid: number,
  medallion: string,
  tablename: string,
  columnname: string,
  rulename: string,
  execresult: number,
};


interface TestResponse {
  ok: boolean;
}


@Injectable({ providedIn: 'root' })
export class resultService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getresults(): Observable<results[]> {
    return this.http.get<results[]>(`${this.api}/results`, );
  }

  getresultsvolumes(): Observable<results[]> {
    return this.http.get<results[]>(`${this.api}/resultsvolumes`, );
  }

  getresultshistory(): Observable<results_hist[]> {
    return this.http.get<results_hist[]>(`${this.api}/resultshist`, );
  }

  getresultsvolumeshistory(): Observable<results_hist[]> {
    return this.http.get<results_hist[]>(`${this.api}/resultsvolumeshist`, );
  }

  getresultscategory(categoryid?: number): Observable<results_hist[]> {

    return this.http.get<results_hist[]>(`${this.api}/resultshist/${categoryid}`, );
  }

  getCategories(): Observable<category[]> {
    return this.http.get<category[]>(`${this.api}/categories`);
  }

  getexecscategory(categoryid?: number): Observable<results_exec[]> {

    return this.http.get<results_exec[]>(`${this.api}/resultsexecs/${categoryid}`, );
  }


}
