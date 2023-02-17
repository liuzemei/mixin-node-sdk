import { EncryptMessageView, MessageView } from '.';

export type MessageCategory =
  | 'ENCRYPTED_TEXT'
  | 'ENCRYPTED_AUDIO'
  | 'ENCRYPTED_POST'
  | 'ENCRYPTED_IMAGE'
  | 'ENCRYPTED_DATA'
  | 'ENCRYPTED_STICKER'
  | 'ENCRYPTED_LIVE'
  | 'ENCRYPTED_LOCATION'
  | 'ENCRYPTED_VIDEO'
  | 'ENCRYPTED_CONTACT'
  | 'PLAIN_TEXT'
  | 'PLAIN_AUDIO'
  | 'PLAIN_POST'
  | 'PLAIN_IMAGE'
  | 'PLAIN_DATA'
  | 'PLAIN_STICKER'
  | 'PLAIN_LIVE'
  | 'PLAIN_LOCATION'
  | 'PLAIN_VIDEO'
  | 'PLAIN_CONTACT'
  | 'APP_CARD'
  | 'APP_BUTTON_GROUP'
  | 'MESSAGE_RECALL'
  | 'SYSTEM_CONVERSATION'
  | 'SYSTEM_ACCOUNT_SNAPSHOT';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface RecallMessage {
  message_id: string;
}

interface EncryptMsg {
  key?: string;
  digest?: string;
}

export interface ImageMessage extends EncryptMsg {
  attachment_id: string;
  mime_type: string;
  width: number;
  height: number;
  size: number;
  thumbnail?: string;
}

export interface DataMessage extends EncryptMsg {
  attachment_id: string;
  mime_type: string;
  size: number;
  name: string;
}

export interface StickerMessage {
  sticker_id: string;
  name?: string;
  album_id?: string;
}

export interface ContactMessage {
  user_id: string;
}

export interface AppCardMessage {
  app_id: string;
  icon_url: string;
  title: string;
  description: string;
  action: string;
  shareable?: boolean;
}

export interface AudioMessage extends EncryptMsg {
  attachment_id: string;
  mime_type: string;
  size: number;
  duration: number;
  wave_form?: string;
}

export interface LiveMessage {
  width: number;
  height: number;
  thumb_url: string;
  url: string;
  shareable?: boolean;
}

export interface VideoMessage extends EncryptMsg {
  attachment_id: string;
  mime_type: string;
  width: number;
  height: number;
  size: number;
  duration: number;
  thumbnail?: string;
}

export interface Session {
  session_id: string;
  user_id?: string;
  public_key?: string;
}

export interface LocationMessage {
  longitude: number;
  latitude: number;
  address?: string;
  name?: string;
}

export interface AppButtonMessage {
  label: string;
  action: string;
  color: string;
}

export interface MessageRequest {
  conversation_id: string;
  message_id: string;
  category: MessageCategory;
  data?: string;
  data_base64?: string;
  recipient_id?: string;
  representative_id?: string;
  quote_message_id?: string;

  checksum?: string;
  recipient_sessions?: Session[];
}

export interface AcknowledgementRequest {
  message_id: string;
  status: string;
}

export interface MessageClientRequest {
  sendAcknowledgements: (messages: AcknowledgementRequest[]) => Promise<void>;
  sendAcknowledgement: (message: AcknowledgementRequest) => Promise<void>;
  sendMessage: (message: MessageRequest) => Promise<MessageView>;
  sendMessages: (messages: MessageRequest[]) => Promise<void>;

  sendEncryptMessage: (message: MessageRequest) => Promise<EncryptMessageView>;
  sendEncryptMessages: (messages: MessageRequest[]) => Promise<EncryptMessageView[]>;

  sendMessageText: (userID: string, text: string) => Promise<MessageView>;
  sendMessagePost: (userID: string, text: string) => Promise<MessageView>;

  sendTextMsg: (userID: string, text: string) => Promise<MessageView>;
  sendPostMsg: (userID: string, text: string) => Promise<MessageView>;
  sendImageMsg: (userID: string, image: ImageMessage) => Promise<MessageView>;
  sendDataMsg: (userID: string, data: DataMessage) => Promise<MessageView>;
  sendStickerMsg: (userID: string, sticker: StickerMessage) => Promise<MessageView>;
  sendContactMsg: (userID: string, contact: ContactMessage) => Promise<MessageView>;
  sendAudioMsg: (userID: string, audio: AudioMessage) => Promise<MessageView>;
  sendLiveMsg: (userID: string, live: LiveMessage) => Promise<MessageView>;
  sendVideoMsg: (userID: string, video: VideoMessage) => Promise<MessageView>;
  sendLocationMsg: (userID: string, location: LocationMessage) => Promise<MessageView>;

  sendEncryptTextMsg: (userID: string, text: string) => Promise<EncryptMessageView>;
  sendEncryptPostMsg: (userID: string, text: string) => Promise<EncryptMessageView>;
  sendEncryptImageMsg: (userID: string, image: ImageMessage) => Promise<EncryptMessageView>;
  sendEncryptDataMsg: (userID: string, data: DataMessage) => Promise<EncryptMessageView>;
  sendEncryptStickerMsg: (userID: string, sticker: StickerMessage) => Promise<EncryptMessageView>;
  sendEncryptContactMsg: (userID: string, contact: ContactMessage) => Promise<EncryptMessageView>;
  sendEncryptAudioMsg: (userID: string, audio: AudioMessage) => Promise<EncryptMessageView>;
  sendEncryptLiveMsg: (userID: string, live: LiveMessage) => Promise<EncryptMessageView>;
  sendEncryptVideoMsg: (userID: string, video: VideoMessage) => Promise<EncryptMessageView>;
  sendEncryptLocationMsg: (userID: string, location: LocationMessage) => Promise<EncryptMessageView>;

  getSessions: (userIDs: string[]) => Promise<Session[]>;
}
