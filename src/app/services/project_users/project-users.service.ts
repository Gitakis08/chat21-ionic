import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProjectUser } from 'src/chat21-core/models/projectUsers';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class ProjectUsersService {

  private SERVER_BASE_URL: string;
  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
      public http: HttpClient,
      public appStorageService: AppStorageService
  ) {}
  
  initialize(serverBaseUrl: string) {
    this.logger.log('[TILEDESK-PROJECT_USERS-SERV] - initialize serverBaseUrl', serverBaseUrl);
    this.SERVER_BASE_URL = serverBaseUrl;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  public getProjectUsersByProjectId(project_id: string): Observable<ProjectUser[]> {
    const url = this.SERVER_BASE_URL + project_id + '/project_users/';
    this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER URL', url);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER RES ', res);
      return res
    }))
  }

  public getProjectUserByProjectId(project_id: string): Promise<ProjectUser> {
    const storedCurrentUser = this.appStorageService.getItem('currentUser');
    if (!storedCurrentUser || storedCurrentUser === 'undefined') {
      this.logger.error('[TILEDESK-SERVICE] - currentUser not found in storage');
      return Promise.reject(new Error('currentUser not found in storage'));
    }

    const currentUser = JSON.parse(storedCurrentUser);
    const currentUserId = currentUser?.uid;

    if (!currentUserId) {
      this.logger.error('[TILEDESK-SERVICE] - currentUser uid not found');
      return Promise.reject(new Error('currentUser uid not found'));
    }

    const url = this.SERVER_BASE_URL + project_id + '/project_users/users/' + currentUserId;
    this.logger.log('[TILEDESK-SERVICE]- GET PROJECT-USER BY USER-ID - URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };

    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER RES ', res);
      return res[0]
    })).toPromise();
  }

}
