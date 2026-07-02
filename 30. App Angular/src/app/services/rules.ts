import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Table } from './medal';
import { UserUpdate } from './conf';

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

export type ruleUpdate = {
  rulename: string;
  categoryid: number;
  typeid: number;
  ruletext: string;
};

export type category= {
  categoryid: number;
  category: string;
}

export type rtype= {
  typeid: number;
  rtype: string;
}

interface TestResponse {
  ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class RuleService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getCategories(): Observable<category[]> {
    return this.http.get<category[]>(`${this.api}/categories`);
  }

  getTypes(): Observable<rtype[]> {
    return this.http.get<rtype[]>(`${this.api}/types`);
  }

  getRules(categoryid?: number, typeid?:number): Observable<rule[]> {
    let params = new HttpParams();
    if (categoryid != null) {
      params = params.set('categoryid', categoryid.toString());
    }
    if (typeid != null) {
      params = params.set('typeid', typeid.toString());
    }
    console.log(categoryid);
    console.log(typeid);

    return this.http.get<rule[]>(`${this.api}/rules`, {params} );
  }

  updateRule(ruleid: number, payload: ruleUpdate): Observable<void> {
    return this.http.put<void>(`${this.api}/rules/${ruleid}`, payload);
  }

  createRule(payload: ruleUpdate): Observable<void> {
    return this.http.put<void>(`${this.api}/rules`, payload);
  }

  deleteRule(ruleid: number): Observable<void> {
    return this.http.put<void>(`${this.api}/rules/${ruleid}/delete`, {});
  }

  validateRule(ruleid: number): Observable<void> {
    return this.http.put<void>(`${this.api}/rules/${ruleid}/validate`, {});
  }

  LLM(prompt: string): Observable<string> {
    const body = { userprompt: prompt };

    return this.http.put<string>(`${this.api}/LLM`, body );
  }

}
