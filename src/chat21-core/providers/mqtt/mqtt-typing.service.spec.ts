import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MQTTTypingService } from './mqtt-typing.service';
import { AppStorageService } from '../abstract/app-storage.service';
import { TIME_TYPING_MESSAGE } from 'src/chat21-core/utils/constants';

describe('MQTTTypingService', () => {
  let service: MQTTTypingService;
  let httpMock: HttpTestingController;
  let appStorage: jasmine.SpyObj<AppStorageService>;

  const serverBaseUrl = 'https://api.example.com/';
  const supportConversation = 'support-group-6013ec749b32000045be650e-4904aee91f8b487aad117bcda860549d';
  const typingUrl = `${serverBaseUrl}6013ec749b32000045be650e/requests/${supportConversation}/typing`;

  beforeEach(() => {
    appStorage = jasmine.createSpyObj('AppStorageService', ['getItem']);
    appStorage.getItem.and.returnValue('test-token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MQTTTypingService,
        { provide: AppStorageService, useValue: appStorage },
      ],
    });

    service = TestBed.inject(MQTTTypingService);
    httpMock = TestBed.inject(HttpTestingController);
    service.initialize('tenant', serverBaseUrl);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts a throttled typing heartbeat for support conversations', () => {
    service.setTyping(supportConversation, 'hello', 'agent-1', 'Agent');

    const req = httpMock.expectOne(typingUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('test-token');
    expect(req.request.body).toEqual({ waitTime: TIME_TYPING_MESSAGE });
    req.flush({ success: true });

    service.setTyping(supportConversation, 'hello again', 'agent-1', 'Agent');
    httpMock.expectNone(typingUrl);
  });

  it('does not send heartbeats for non-support conversations', () => {
    service.setTyping('direct-user-1', 'hello', 'agent-1', 'Agent');
    httpMock.expectNone(() => true);
  });

  it('does not send heartbeats when input is empty', () => {
    service.setTyping(supportConversation, '   ', 'agent-1', 'Agent');
    httpMock.expectNone(() => true);
  });

  it('sends another heartbeat after the throttle window', () => {
    spyOn(Date, 'now').and.returnValues(0, 0, TIME_TYPING_MESSAGE);

    service.setTyping(supportConversation, 'hello', 'agent-1', 'Agent');
    httpMock.expectOne(typingUrl).flush({ success: true });

    service.setTyping(supportConversation, 'hello again', 'agent-1', 'Agent');
    const req = httpMock.expectOne(typingUrl);
    req.flush({ success: true });
  });
});
