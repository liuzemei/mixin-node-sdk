import { Client } from '../client';
import { KeystoreAuth } from '../mixin/keystore';
import { signRequest } from '../mixin/sign';
import { AcknowledgementRequest, Keystore } from '../types';
import WebSocket from 'ws';
import { BlazeMessage, MessageView } from '../types/blaze';
import { gzip, ungzip } from 'pako';
import { decryptMessageData } from '../mixin/dump_msg';

const zeromeshUrl = 'wss://mixin-blaze.zeromesh.net';
const oneUrl = 'wss://blaze.mixin.one/';

interface BlazeOptions {
  parse?: boolean; // parse message
  syncAck?: boolean; // sync ack
}

interface BlazeHandler {
  onMessage: (message: MessageView) => void | Promise<void>;
  onAckReceipt?: (message: MessageView) => void | Promise<void>;
  onTransfer?: (transfer: MessageView) => void | Promise<void>;
  onConversation?: (conversation: MessageView) => void | Promise<void>;
}

export class BlazeClient extends Client {
  ws?: WebSocket;
  h!: BlazeHandler;
  url = oneUrl;
  isAlive = false;
  pingInterval: any;
  options: BlazeOptions = {
    parse: false,
    syncAck: false,
  };
  sendAcknowledgement!: (message: AcknowledgementRequest) => Promise<void>;

  constructor(keystore?: Keystore, option?: BlazeOptions) {
    super(keystore);
    if (option) this.options = option;
  }

  loopBlaze(h: BlazeHandler) {
    if (!h.onMessage) throw new Error('OnMessage not set');
    this.h = h;
    this._loopBlaze();
  }

  _loopBlaze() {
    const k = new KeystoreAuth(this.keystore);
    const headers = {
      Authorization: 'Bearer ' + k.signToken(signRequest('GET', '/'), ''),
    };
    this.ws = new WebSocket(this.url, 'Mixin-Blaze-1', {
      headers,
      handshakeTimeout: 3000,
    });
    this.ws.onmessage = async event => {
      const msg = this.decode(event.data as Uint8Array);
      if (!msg) return;
      if (msg.category && msg.category.startsWith('ENCRYPTED_')) {
        msg.data = decryptMessageData(msg.data_base64!, this.keystore.session_id, this.keystore.private_key);
      }
      if (this.options?.parse && msg.data) {
        msg.data = Buffer.from(msg.data, 'base64').toString();
        if (msg.data) {
          try {
            msg.data = JSON.parse(msg.data);
          } catch (e) {}
        }
      }
      if (msg.source === 'ACKNOWLEDGE_MESSAGE_RECEIPT' && this.h.onAckReceipt) await this.h.onAckReceipt(msg);
      else if (msg.category === 'SYSTEM_CONVERSATION' && this.h.onConversation) await this.h.onConversation(msg);
      else if (msg.category === 'SYSTEM_ACCOUNT_SNAPSHOT' && this.h.onTransfer) await this.h.onTransfer(msg);
      else await this.h.onMessage(msg);
      if (this.options.syncAck) await this.sendAcknowledgement({ message_id: msg.message_id!, status: 'READ' });
    };
    this.ws.onclose = () => {
      clearInterval(this.pingInterval);
      this._loopBlaze();
    };
    this.ws.onerror = e => {
      e.message === 'Opening handshake has timed out' && (this.url = this.url === oneUrl ? zeromeshUrl : oneUrl);
    };
    this.ws.on('ping', () => {
      this.ws!.pong();
    });
    this.ws.on('pong', () => {
      this.isAlive = true;
    });
    this.ws.onopen = () => {
      this.isAlive = true;
      this.heartbeat();
      this.send_raw({ id: this.newUUID(), action: 'LIST_PENDING_MESSAGES' });
    };
  }

  heartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws!.readyState === WebSocket.CONNECTING) return;
      if (!this.isAlive) return this.ws!.terminate();
      this.isAlive = false;
      this.ws!.ping();
    }, 1000 * 30);
  }

  decode(data: Uint8Array): MessageView {
    const t = ungzip(data, { to: 'string' });
    const msgObj = JSON.parse(t);
    return msgObj.data;
  }

  send_raw(message: BlazeMessage) {
    return new Promise(resolve => {
      const buffer = Buffer.from(JSON.stringify(message), 'utf-8');
      const zipped = gzip(buffer);
      if (this.ws!.readyState === WebSocket.OPEN) {
        this.ws!.send(zipped);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }
}
