import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';

import { PresenceService } from '../abstract/presence.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { TypingService } from '../abstract/typing.service';
import { AppStorageService } from '../abstract/app-storage.service';
import { TIME_TYPING_MESSAGE } from 'src/chat21-core/utils/constants';
import { getProjectIdSelectedConversation } from 'src/chat21-core/utils/utils';

export class TypingModel {


  constructor(
      public timestamp: any,
      public message: string,
      public name: string
  ) { }
}

@Injectable({
  providedIn: 'root'
})

export class MQTTTypingService extends TypingService {

  BSIsTyping: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  BSSetTyping: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  private tenant: string;
  private serverBaseUrl: string;
  private lastHeartbeatAt = 0;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private http: HttpClient,
    private appStorage: AppStorageService,
  ) {
    super();
  }

  initialize(tenant: string, serverBaseUrl?: string) {
    this.tenant = tenant;
    this.serverBaseUrl = serverBaseUrl;
    this.logger.info('[MQTT-TYPING] initialize tenant', this.tenant, 'serverBaseUrl', this.serverBaseUrl);
  }

  isTyping(_idConversation: string, _idUser: string) {
    // Receive-side typing via MQTT/WebSocket is handled separately.
  }

  setTyping(idConversation: string, message: string, _idUser: string, _userFullname: string) {
    if (!idConversation || !idConversation.startsWith('support-group')) {
      return;
    }

    if (!message || message.trim() === '') {
      return;
    }

    const now = Date.now();
    if (now - this.lastHeartbeatAt < TIME_TYPING_MESSAGE) {
      return;
    }

    const projectId = getProjectIdSelectedConversation(idConversation);
    if (!projectId || !this.serverBaseUrl) {
      return;
    }

    const token = this.appStorage.getItem('tiledeskToken');
    if (!token) {
      return;
    }

    this.lastHeartbeatAt = now;
    const url = `${this.serverBaseUrl}${projectId}/requests/${idConversation}/typing`;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token,
      }),
    };
    const body = { waitTime: TIME_TYPING_MESSAGE };

    this.http.post(url, body, httpOptions).pipe(first()).subscribe({
      next: (res) => {
        this.logger.debug('[MQTT-TYPING] typing heartbeat sent', res);
      },
      error: (err) => {
        this.logger.error('[MQTT-TYPING] typing heartbeat error', err);
      },
    });
  }

}
