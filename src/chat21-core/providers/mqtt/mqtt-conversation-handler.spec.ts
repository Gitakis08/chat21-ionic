import { MQTTConversationHandler } from './mqtt-conversation-handler';
import { Chat21Service } from './chat-service';
import { UserModel } from '../../models/user';

describe('MQTTConversationHandler live message uid', () => {
  let handler: MQTTConversationHandler;
  let onMessageAddedCallback: (message: any, topic?: string) => void;
  const loggedUser: UserModel = { uid: 'agent-1' } as UserModel;

  beforeEach(() => {
    onMessageAddedCallback = null;
    const chat21Service = {
      chatClient: {
        lastMessages: (_conv: string, callback: (err: any, messages: any[]) => void) => {
          callback(null, []);
        },
        onMessageAddedInConversation: (_conv: string, callback: (message: any, topic?: string) => void) => {
          onMessageAddedCallback = callback;
          return {};
        },
        onMessageUpdatedInConversation: () => ({}),
        updateMessageStatus: () => {},
      },
    } as Chat21Service;

    handler = new MQTTConversationHandler(chat21Service, true);
    handler.initialize('visitor-1', 'Visitor', loggedUser, 'tenant', new Map());
    handler.connect();
  });

  it('uses message_id for other-user live messages even when tempUID is present', () => {
    onMessageAddedCallback({
      message_id: 'msg-visitor-1',
      sender: 'visitor-1',
      sender_fullname: 'Visitor',
      text: 'Hello',
      timestamp: 1000,
      status: 200,
      type: 'text',
      attributes: { tempUID: 'visitor-temp-uid' },
    });

    expect(handler.messages.length).toBe(1);
    expect(handler.messages[0].uid).toBe('msg-visitor-1');
  });

  it('uses tempUID for logged-in user live messages', () => {
    onMessageAddedCallback({
      message_id: 'msg-agent-1',
      sender: 'agent-1',
      sender_fullname: 'Agent',
      text: 'Reply',
      timestamp: 2000,
      status: 150,
      type: 'text',
      attributes: { tempUID: 'agent-temp-uid' },
    });

    expect(handler.messages.length).toBe(1);
    expect(handler.messages[0].uid).toBe('agent-temp-uid');
  });

  it('dedupes visitor live events against lastMessages history by message_id', () => {
    const chat21Service = handler['chat21Service'] as Chat21Service;
    chat21Service.chatClient.lastMessages = (_conv: string, callback: (err: any, messages: any[]) => void) => {
      callback(null, [{
        message_id: 'msg-visitor-1',
        sender: 'visitor-1',
        sender_fullname: 'Visitor',
        text: 'Hello',
        timestamp: 1000,
        status: 200,
        type: 'text',
        attributes: { tempUID: 'visitor-temp-uid' },
      }]);
    };

    handler.connect();

    expect(handler.messages.length).toBe(1);
    expect(handler.messages[0].uid).toBe('msg-visitor-1');

    onMessageAddedCallback({
      message_id: 'msg-visitor-1',
      sender: 'visitor-1',
      sender_fullname: 'Visitor',
      text: 'Hello',
      timestamp: 1000,
      status: 200,
      type: 'text',
      attributes: { tempUID: 'visitor-temp-uid' },
    });

    expect(handler.messages.length).toBe(1);
    expect(handler.messages[0].uid).toBe('msg-visitor-1');
  });
});
