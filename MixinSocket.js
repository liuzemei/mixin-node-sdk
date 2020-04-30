const zlib = require('zlib');
const WebSocket = require('ws');
const Mixin = require('./mixin')
const _request = require('./http')

class MixinSocket extends Mixin {
  constructor(config, useChinaServer, debug) {
    super(config);
    this._request = _request(config, useChinaServer, debug)
    this.url = useChinaServer ? 'wss://mixin-blaze.zeromesh.net' : 'wss://blaze.mixin.one/'
    this.protocols = 'Mixin-Blaze-1'
    this.debug = debug || false
    this.wsInterval = null
    this.ws = null
  }

  start() {
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000)
      this.ws = null
    }

    const headers = {
      Authorization: `Bearer ${this.getJwtToken(this.CLIENT_CONFIG, 'GET', '/', '')}`
    }
    this.ws = new WebSocket(this.url, this.protocols, { headers })
    this.ws.onmessage = this._on_message.bind(this)
    this.ws.onerror = this._on_error.bind(this)
    this.ws.onclose = this._on_close.bind(this)
    this.ws.onopen = this._on_open.bind(this)

    clearInterval(this.wsInterval)
    this.wsInterval = setInterval(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        this.start()
      }
    }, 15000)
  }

  send_raw(message) {
    return new Promise((resolve) => {
      try {
        const buffer = Buffer.from(JSON.stringify(message), 'utf-8');
        zlib.gzip(buffer, (_, zipped) => {
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(zipped);
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  async get_message_handler(message) { }

  async  _on_message(originData) {
    let message = await this.decode(originData.data)
    if (message === false) return this.ws.readyState !== WebSocket.OPEN && this.start()
    await this.get_message_handler(message)
  }

  _on_open() {
    if (this.debug) console.error('ws connected...' + new Date().toISOString())
    this.send_raw({ id: this.getUUID(), action: 'LIST_PENDING_MESSAGES' })
  }


  _on_error(e) {
    if (this.debug) console.error(e)
  }

  _on_close(e) {
    if (this.debug) console.error(e)
    this.start()
  }


  async read_message(message) {
    if (!message || !message.data || !message.data.message_id) return false
    return await this.send_raw({
      id: this.getUUID(),
      action: 'ACKNOWLEDGE_MESSAGE_RECEIPT',
      params: {
        message_id: message.data.message_id,
        status: 'READ'
      }
    })
  }

  decode(data) {
    return new Promise((resolve) => {
      try {
        zlib.gunzip(data, (err, unzipped) => {
          if (err) {
            return resolve(false)
          }
          const msgObj = JSON.parse(unzipped.toString());
          if (msgObj && msgObj.action === 'CREATE_MESSAGE' && msgObj.data && msgObj.data.category === 'PLAIN_TEXT') {
            msgObj.data.data = Buffer.from(msgObj.data.data, 'base64').toString('utf-8');
          }
          resolve(msgObj);
        });
      } catch (e) {
        return resolve(false)
      }
    });
  }

  async send_text(text, message) {
    return await this.send_raw(this._create_message(text, message, 'PLAIN_TEXT'))
  }

  async send_image(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_IMAGE'))
  }

  async send_video(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_VIDEO'))
  }

  async send_live(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_LIVE'))
  }

  async send_file(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_DATA'))
  }

  async send_sticker(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_STICKER'))
  }

  async send_contact(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'PLAIN_CONTACT'))
  }

  async send_buttons(obj, message) {
    obj = Array.isArray(obj) ? obj : [obj]
    return await this.send_raw(this._create_message(obj, message, 'APP_BUTTON_GROUP'))
  }

  async send_app(obj, message) {
    return await this.send_raw(this._create_message(obj, message, 'APP_CARD'))
  }


  _create_message(data, message, type) {
    data = typeof data === 'object' ? JSON.stringify(data) : data.toString()
    return {
      id: this.getUUID(),
      action: "CREATE_MESSAGE",
      params: {
        "conversation_id": message.data.conversation_id,
        "category": type,
        "status": "SENT",
        "message_id": this.getUUID(),
        "data": Buffer.from(data).toString('base64'),
      }
    }
  }

  async send_message(data, message, type) {
    return await this.send_raw(this._create_message(data, message, type))
  }

  async send_messages(messages) {
    return await this.send_raw({
      id: this.getUUID(),
      action: "CREATE_PLAIN_MESSAGES",
      params: { messages }
    })
  }
}

module.exports = MixinSocket
