import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import {
  CustomObservable,
  CustomObservableLogic
} from '../common/custom-observable/customObservableLogic';
import { ProjectStore } from '@tungle/project/state/project/project.store';
// import { LoadingLogic } from '../shared-logic/loading-logic';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  constructor(private http: HttpClient, private store: ProjectStore) {}

  /*getAllRequest<T>(controller: string, params: any[] = []): Observable<T[]> {
    const url = this.baseUrl + controller + "/" + params.join("/");
    return this.http.get<T[]>(url);
  }*/

  /**
   * {@link getJsonRequest}
   * @param isLoading
   * @returns
   */
  getJsonRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.getJsonRequestWithLoading : this.getJsonRequest;
    return fn.bind(this) as typeof this.getJsonRequest;
  }

  /**
   * {@link getTextRequest}
   * @param isLoading
   * @returns
   */
  getTextRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.getTextRequestWithLoading : this.getTextRequest;
    return fn.bind(this) as typeof this.getTextRequest;
  }

  /**
   * {@link jsonRequest}
   * @param isLoading
   * @returns
   */
  jsonRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.jsonRequestWithLoading : this.jsonRequest;
    return fn.bind(this) as typeof this.jsonRequest;
  }

  formRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.formRequestWithLoading : this.formRequest;
    return fn.bind(this) as typeof this.formRequest;
  }

  getBlobRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.getBlobRequestWithLoading : this.getBlobRequest;
    return fn.bind(this) as typeof this.getBlobRequest;
  }

  /**
   * {@link textRequest}
   * @param isLoading
   * @returns
   */
  textRequestWhetherLoading(isLoading: boolean) {
    const fn = isLoading ? this.textRequestWithLoading : this.textRequest;
    return fn.bind(this) as typeof this.textRequest;
  }

  /**
   * @param url
   * @param params
   */
  getJsonRequest<T>(url: string, params: any[] = []): CustomObservable<T | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    url + '/' + params.map((p) => encodeURIComponent(p)).join('/');
    const observable = this.http.get<T>(fullUrl);
    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param url
   * @param params
   */
  getTextRequest(url: string, params: any[] = []): CustomObservable<string | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const observable = this.http.get(fullUrl, { responseType: 'text' });
    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   * GET request for file download (Blob)
   */
  getBlobRequest(url: string, params: any[] = []): CustomObservable<Blob | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const observable = this.http.get(fullUrl, { responseType: 'blob' }) as Observable<Blob>;
    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param data
   * @param params
   */
  jsonRequest<T>(
    method: SupportedMethod,
    url: string,
    data: T,
    params: any[] = []
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };

    let observable: Observable<any>;
    switch (method) {
      case 'POST':
        observable = this.http.post<T>(fullUrl, data, httpOptions);
        break;
      case 'PUT':
        observable = this.http.put<T>(fullUrl, data, httpOptions);
        break;
      case 'DELETE':
        observable = this.http.delete<T>(fullUrl, httpOptions);
        break;
      case 'PATCH':
        observable = this.http.patch<T>(fullUrl, data, httpOptions);
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   * Multipart/FormData request (file upload etc). Do NOT set Content-Type manually.
   */
  formRequest(
    method: SupportedMethod,
    url: string,
    data: FormData,
    params: any[] = []
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);

    let observable: Observable<any>;
    switch (method) {
      case 'POST':
        observable = this.http.post(fullUrl, data);
        break;
      case 'PUT':
        observable = this.http.put(fullUrl, data);
        break;
      case 'PATCH':
        observable = this.http.patch(fullUrl, data);
        break;
      case 'DELETE':
        // Not typical for multipart, but keep parity
        observable = this.http.request('DELETE', fullUrl, { body: data });
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param params
   * @param text
   */
  textRequest<T>(
    method: SupportedMethod,
    url: string,
    params: any[] = [],
    text: string = ''
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/text' })
    };

    let observable: Observable<any>;
    switch (method) {
      case 'POST':
        observable = this.http.post<T>(fullUrl, text, httpOptions);
        break;
      case 'PUT':
        observable = this.http.put<T>(fullUrl, text, httpOptions);
        break;
      case 'DELETE':
        observable = this.http.delete<T>(fullUrl, httpOptions);
        break;
      case 'PATCH':
        observable = this.http.patch<T>(fullUrl, text, httpOptions);
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param url
   * @param params
   */
  getJsonRequestWithLoading<T>(
    url: string,
    params: any[] = []
  ): CustomObservable<T | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    this.switchLoading(true);
    let observable = this.http.get<T>(fullUrl).pipe<T>(
      tap(() => {
        this.switchLoading(false);
      })
    );

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param url
   * @param params
   */
  getTextRequestWithLoading(
    url: string,
    params: any[] = []
  ): CustomObservable<string | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    this.switchLoading(true);
    const observable = this.http.get(fullUrl, { responseType: 'text' }).pipe<string>(
      tap(() => {
        this.switchLoading(false);
      })
    );

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   * GET request for file download (Blob) with loading spinner
   */
  getBlobRequestWithLoading(
    url: string,
    params: any[] = []
  ): CustomObservable<Blob | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);
    this.switchLoading(true);
    const observable = (this.http.get(fullUrl, { responseType: 'blob' }) as Observable<Blob>).pipe(
      tap(() => {
        this.switchLoading(false);
      })
    );
    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param data
   * @param params
   */
  jsonRequestWithLoading<T>(
    method: SupportedMethod,
    url: string,
    data: T,
    params: any[] = []
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };

    let observable: Observable<any>;
    this.switchLoading(true);
    switch (method) {
      case 'POST':
        observable = this.http.post<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PUT':
        observable = this.http.put<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'DELETE':
        const deleteOptions = {
          ...httpOptions,
          body: data
        };
        observable = this.http.delete<T>(fullUrl, deleteOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PATCH':
        observable = this.http.patch<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   * Multipart/FormData request with loading spinner.
   */
  formRequestWithLoading(
    method: SupportedMethod,
    url: string,
    data: FormData,
    params: any[] = []
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);

    let observable: Observable<any>;
    this.switchLoading(true);
    switch (method) {
      case 'POST':
        observable = this.http.post(fullUrl, data).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PUT':
        observable = this.http.put(fullUrl, data).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PATCH':
        observable = this.http.patch(fullUrl, data).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'DELETE':
        observable = this.http.request('DELETE', fullUrl, { body: data }).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param params
   * @param text
   */
  textRequestWithLoading<T>(
    method: SupportedMethod,
    url: string,
    params: any[] = [],
    text: string = ''
  ): CustomObservable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/text' })
    };

    let observable: Observable<any>;
    this.switchLoading(true);
    switch (method) {
      case 'POST':
        observable = this.http.post<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PUT':
        observable = this.http.put<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'DELETE':
        observable = this.http.delete<T>(fullUrl, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
      case 'PATCH':
        observable = this.http.patch<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
        break;
    }

    return CustomObservableLogic.transCustomObservable(observable);
  }

  /**
   *
   * @param url
   * @param file
   * @param formName
   * @param params
   * @returns
   */
  uploadFileWithLoading<T = any>(
    url: string,
    file: File,
    formName: string = 'file',
    params: any[] = []
  ): CustomObservable<T | null | undefined> {
    const fullUrl = this.concatParamsToUrl(url, params);

    const formData: FormData = new FormData();
    formData.append(formName, file, file.name);

    this.switchLoading(true);
    return CustomObservableLogic.transCustomObservable(
      this.http.post<T>(fullUrl, formData).pipe(
        tap(() => {
          this.switchLoading(false);
        })
      )
    );
  }

  /**
   *
   * @param url
   * @param params
   */
  getJsonRequestLegacy<T>(url: string, params: any[] = []): Observable<T> {
    const fullUrl = this.concatParamsToUrl(url, params);
    return this.http.get<T>(fullUrl);
  }

  /**
   *
   * @param url
   * @param params
   */
  getTextRequestLegacy(url: string, params: any[] = []): Observable<string> {
    const fullUrl = this.concatParamsToUrl(url, params);
    return this.http.get(fullUrl, { responseType: 'text' });
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param data
   * @param params
   */
  jsonRequestLegacy<T>(
    method: SupportedMethod,
    url: string,
    data: T,
    params: any[] = []
  ): Observable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };

    switch (method) {
      case 'POST':
        return this.http.post<T>(fullUrl, data, httpOptions);
      case 'PUT':
        return this.http.put<T>(fullUrl, data, httpOptions);
      case 'DELETE':
        return this.http.delete<T>(fullUrl, httpOptions);
      case 'PATCH':
        return this.http.patch<T>(fullUrl, data, httpOptions);
    }
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param params
   * @param text
   */
  textRequestLegacy<T>(
    method: SupportedMethod,
    url: string,
    params: any[] = [],
    text: string = ''
  ): Observable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/text' })
    };

    switch (method) {
      case 'POST':
        return this.http.post<T>(fullUrl, text, httpOptions);
      case 'PUT':
        return this.http.put<T>(fullUrl, text, httpOptions);
      case 'DELETE':
        return this.http.delete<T>(fullUrl, httpOptions);
      case 'PATCH':
        return this.http.patch<T>(fullUrl, text, httpOptions);
    }
  }

  /**
   *
   * @param url
   * @param params
   */
  getJsonRequestWithLoadingLegacy<T>(url: string, params: any[] = []): Observable<T> {
    const fullUrl = this.concatParamsToUrl(url, params);
    this.switchLoading(true);
    return this.http.get<T>(fullUrl).pipe(
      tap(() => {
        this.switchLoading(false);
      })
    );
  }

  /**
   *
   * @param url
   * @param params
   */
  getTextRequestWithLoadingLegacy(url: string, params: any[] = []): Observable<string> {
    const fullUrl = this.concatParamsToUrl(url, params);
    this.switchLoading(true);
    return this.http.get(fullUrl, { responseType: 'text' }).pipe(
      tap(() => {
        this.switchLoading(false);
      })
    );
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param data
   * @param params
   */
  jsonRequestWithLoadingLegacy<T>(
    method: SupportedMethod,
    url: string,
    data: T,
    params: any[] = []
  ): Observable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };

    this.switchLoading(true);
    switch (method) {
      case 'POST':
        return this.http.post<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'PUT':
        return this.http.put<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'DELETE':
        return this.http.delete<T>(fullUrl, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'PATCH':
        return this.http.patch<T>(fullUrl, data, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
    }
  }

  /**
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param params
   * @param text
   */ textRequestWithLoadingLegacy<T>(
    method: SupportedMethod,
    url: string,
    params: any[] = [],
    text: string = ''
  ): Observable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/text' })
    };

    this.switchLoading(true);
    switch (method) {
      case 'POST':
        return this.http.post<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'PUT':
        return this.http.put<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'DELETE':
        return this.http.delete<T>(fullUrl, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
      case 'PATCH':
        return this.http.patch<T>(fullUrl, text, httpOptions).pipe(
          tap(() => {
            this.switchLoading(false);
          })
        );
    }
  }

  /**
   *
   *
   * @param method "POST","PUT","DELETE","PATCH"
   * @param url
   * @param data
   * @param params
   */
  fileRequest<T>(
    method: SupportedMethod,
    url: string,
    data: T,
    params: any[] = []
  ): Observable<any> {
    const fullUrl = this.concatParamsToUrl(url, params);
    const httpOptions = {
      responseType: 'blob' as 'json',
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };

    switch (method) {
      case 'POST':
        return this.http.post<T>(fullUrl, data, httpOptions);
      case 'PUT':
        return this.http.put<T>(fullUrl, data, httpOptions);
      case 'DELETE':
        return this.http.delete<T>(fullUrl, httpOptions);
      case 'PATCH':
        return this.http.patch<T>(fullUrl, data, httpOptions);
    }
  }

  /**
   * @param mode
   */
  private switchLoading(mode: boolean) {
    this.store.setLoading(mode);
  }

  private concatParamsToUrl(url: string, params: any[]): string {
    return url + '/' + params.map((p) => encodeURIComponent(p)).join('/');
  }
}

export type SupportedMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';
