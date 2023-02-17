import { AxiosInstance } from 'axios';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  AcknowledgementRequest,
  Keystore,
  MessageCategory,
  MessageClientRequest,
  MessageRequest,
  MessageView,
  ImageMessage,
  DataMessage,
  StickerMessage,
  ContactMessage,
  AppCardMessage,
  AudioMessage,
  LiveMessage,
  LocationMessage,
  VideoMessage,
  AppButtonMessage,
  RecallMessage,
  Session,
  EncryptMessageView,
  Attachment,
} from '../types';
import { decryptAttachment, encryptMessageData, generateUserCheckSum } from '../mixin/dump_msg';
import { getFileByURL } from '../mixin/tools';

let _sessionCache: { [key: string]: Session[] } = {};

export class MessageClient implements MessageClientRequest {
  keystore!: Keystore;
  request!: AxiosInstance;
  newUUID!: () => string;
  uniqueConversationID!: (userID: string, recipientID: string) => string;
  showAttachment!: (attachment_id: string) => Promise<Attachment>;

  sendAcknowledgements(messages: AcknowledgementRequest[]): Promise<void> {
    return this.request.post('/acknowledgements', messages);
  }

  sendAcknowledgement(message: AcknowledgementRequest): Promise<void> {
    return this.sendAcknowledgements([message]);
  }

  sendMessage(message: MessageRequest): Promise<MessageView> {
    return this.request.post('/messages', message);
  }

  sendMessages(messages: MessageRequest[]): Promise<void> {
    return this.request.post('/messages', messages);
  }

  sendMsg(recipient_id: string, category: MessageCategory, data: any): Promise<MessageView> {
    if (typeof data === 'object') data = JSON.stringify(data);
    return this.sendMessage({
      category,
      recipient_id,
      conversation_id: this.uniqueConversationID(this.keystore.client_id, recipient_id),
      message_id: this.newUUID(),
      data: Buffer.from(data).toString('base64url'),
    });
  }

  sendMessageText(userID: string, text: string): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_TEXT', text);
  }

  sendMessagePost(userID: string, text: string): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_POST', text);
  }

  sendTextMsg(userID: string, text: string): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_TEXT', text);
  }

  sendPostMsg(userID: string, text: string): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_POST', text);
  }

  sendImageMsg(userID: string, image: ImageMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_IMAGE', image);
  }

  sendDataMsg(userID: string, data: DataMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_DATA', data);
  }

  sendStickerMsg(userID: string, sticker: StickerMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_STICKER', sticker);
  }

  sendContactMsg(userID: string, contact: ContactMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_CONTACT', contact);
  }

  sendAppCardMsg(userID: string, appCard: AppCardMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'APP_CARD', appCard);
  }

  sendAudioMsg(userID: string, audio: AudioMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_AUDIO', audio);
  }

  sendLiveMsg(userID: string, live: LiveMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_LIVE', live);
  }

  sendVideoMsg(userID: string, video: VideoMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_VIDEO', video);
  }

  sendLocationMsg(userID: string, location: LocationMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'PLAIN_LOCATION', location);
  }

  sendAppButtonMsg(userID: string, appButton: AppButtonMessage[]): Promise<MessageView> {
    return this.sendMsg(userID, 'APP_BUTTON_GROUP', appButton);
  }

  sendRecallMsg(userID: string, message: RecallMessage): Promise<MessageView> {
    return this.sendMsg(userID, 'MESSAGE_RECALL', message);
  }

  sendEncryptMessage(message: MessageRequest): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(message.recipient_id!, message.category, message.data, false, message.message_id, message.conversation_id);
  }

  async _sendEncryptMsg(userID: string, category: MessageCategory, data: any, isRetry = false, message_id?: string, conversation_id?: string): Promise<EncryptMessageView> {
    if (!category.startsWith('ENCRYPTED_')) return Promise.reject('category must start with ENCRYPTED_');
    if (typeof data === 'object') data = JSON.stringify(data);
    const sessions = await this.getSessionsWithCache([userID]);
    const data_base64 = encryptMessageData(Buffer.from(data), sessions[userID], Buffer.from(this.keystore.private_key, 'base64'));
    const checksum = generateUserCheckSum(sessions[userID] || []);
    const recipient_sessions = sessions[userID].map(v => ({ session_id: v.session_id }));
    if (!message_id) message_id = this.newUUID();
    if (!conversation_id) conversation_id = this.uniqueConversationID(this.keystore.client_id, userID);
    const [res] = await this.sendEncryptMessagesRaw([{ category, recipient_id: userID, conversation_id, message_id, data_base64, checksum, recipient_sessions }]);
    if (res.state === 'SUCCESS' || res.sessions.length === 0 || isRetry) return res;
    this.cacheSession(res.sessions);
    return this._sendEncryptMsg(userID, category, data, true, message_id);
  }

  sendEncryptMessagesRaw(messages: MessageRequest[]): Promise<EncryptMessageView[]> {
    return this.request.post('/encrypted_messages', messages);
  }

  sendEncryptTextMsg(userID: string, text: string): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_TEXT', text);
  }

  sendEncryptPostMsg(userID: string, text: string): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_POST', text);
  }

  sendEncryptImageMsg(userID: string, image: ImageMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_IMAGE', image);
  }

  sendEncryptDataMsg(userID: string, data: DataMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_DATA', data);
  }

  sendEncryptStickerMsg(userID: string, sticker: StickerMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_STICKER', sticker);
  }

  sendEncryptContactMsg(userID: string, contact: ContactMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_CONTACT', contact);
  }

  sendEncryptAudioMsg(userID: string, audio: AudioMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_AUDIO', audio);
  }

  sendEncryptLiveMsg(userID: string, live: LiveMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_LIVE', live);
  }

  sendEncryptVideoMsg(userID: string, video: VideoMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_VIDEO', video);
  }

  sendEncryptLocationMsg(userID: string, location: LocationMessage): Promise<EncryptMessageView> {
    return this._sendEncryptMsg(userID, 'ENCRYPTED_LOCATION', location);
  }

  async sendEncryptMessages(_messages: MessageRequest[]): Promise<EncryptMessageView[]> {
    return this._sendEncryptMsgs(_messages);
  }

  async _sendEncryptMsgs(_messages: MessageRequest[], isRetry = false, resp: EncryptMessageView[] = []): Promise<EncryptMessageView[]> {
    let userIDs = _messages.map(v => v.recipient_id!);
    const sessions = await this.getSessionsWithCache(userIDs);
    const msgs: MessageRequest[] = [];
    const msgMap = new Map<string, MessageRequest>();
    for (const msg of _messages) {
      msgMap.set(msg.message_id!, msg);
      let { category, recipient_id, data, message_id, conversation_id } = msg;
      if (!category.startsWith('ENCRYPTED_')) throw new Error('category must start with ENCRYPTED_');
      let session = sessions[recipient_id!];
      const data_base64 = encryptMessageData(Buffer.from(data!), session, Buffer.from(this.keystore.private_key, 'base64'));
      const checksum = generateUserCheckSum(session || []);
      const recipient_sessions = session.map(v => ({ session_id: v.session_id }));
      if (!message_id) message_id = this.newUUID();
      if (!conversation_id) conversation_id = this.uniqueConversationID(this.keystore.client_id, recipient_id!);
      msgs.push({ category, recipient_id, conversation_id, message_id, data_base64, checksum, recipient_sessions });
    }

    const res = await this.sendEncryptMessagesRaw(msgs);
    let unsent: MessageRequest[] = [];
    for (const s of res) {
      if (s.state === 'SUCCESS' || isRetry) resp.push(s);
      else {
        this.cacheSession(s.sessions);
        unsent.push(msgMap.get(s.message_id)!);
      }
    }
    if (unsent.length === 0 || isRetry) return resp;
    return this._sendEncryptMsgs(unsent, true, resp);
  }

  async getSessions(userIDs: string[]): Promise<Session[]> {
    return this.request.post('/sessions/fetch', userIDs);
  }

  async getSessionsWithCache(userIDs: string[]): Promise<{ [key: string]: Session[] }> {
    let needFetch: string[] = [];
    let result: { [key: string]: Session[] } = {};
    for (const userID of userIDs) {
      const session = this.getSessionByCache(userID);
      if (session) {
        result[userID] = session;
        continue;
      } else {
        needFetch.push(userID);
      }
    }
    if (needFetch.length === 0) return result;
    const sessions: Session[] = await this.request.post('/sessions/fetch', needFetch);

    const _result = this.cacheSession(sessions);
    result = { ...result, ..._result };
    return result;
  }

  cacheSession(sessions: Session[]) {
    if (!existsSync('.sessions')) mkdirSync('.sessions');
    let result: { [key: string]: Session[] } = {};
    sessions.forEach(session => {
      if (!session.user_id) return;
      if (!result[session.user_id]) result[session.user_id] = [];
      result[session.user_id].push(session);
    });
    for (const userID in result) {
      _sessionCache[userID] = result[userID];
      const sessionPath = resolve(process.cwd(), '.sessions', `${userID}.json`);
      writeFileSync(sessionPath, JSON.stringify(result[userID]));
    }
    return result;
  }

  async decryptAttachmentByMsgData(msgData: { attachment_id: string; key?: string }): Promise<Buffer> {
    if (typeof msgData !== 'object') return Promise.reject(`msgData should be an object...`);
    if (!msgData.attachment_id) return Promise.reject(`msgData should contain attachment_id...`);
    const { view_url } = await this.showAttachment(msgData.attachment_id);
    const raw = await getFileByURL(view_url);
    if (!msgData.key) return raw;
    return decryptAttachment(raw, msgData.key);
  }

  getSessionByCache(userID: string): Session[] | undefined {
    return _sessionCache[userID];
  }
}
