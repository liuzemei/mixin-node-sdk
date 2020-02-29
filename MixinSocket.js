const zlib = require('zlib');
const WebSocket = require('ws');
const Mixin = require('./mixin')
const _request = require('./http')

class MixinSocket extends Mixin {
    constructor(config) {
        super(config);
        this._request = _request(config)
        this.url = 'wss://blaze.mixin.one/'
        this.protocols = 'Mixin-Blaze-1'
        this.isConnected = false;
        this.reconnectTimeoutId = 0;
    }

    start() {
        const headers = {
            Authorization: `Bearer ${this.getJwtToken(this.CLIENT_CONFIG, 'GET', '/', '')}`
        }

        this.socket = new WebSocket(this.url, this.protocols, { headers })
        this.socket.onmessage = this._on_message.bind(this)
        this.socket.onopen = this._on_open.bind(this)
        this.socket.onerror = this._on_error.bind(this)
        this.socket.onclose = this._on_close.bind(this)
    }


    send_raw(message) {
        return new Promise((resolve, reject) => {
            try {
                const buffer = Buffer.from(JSON.stringify(message), 'utf-8');
                zlib.gzip(buffer, (_, zipped) => {
                    if (this.socket.readyState === WebSocket.OPEN) {
                        this.socket.send(zipped);
                        resolve();
                    } else {
                        reject(console.log('Socket connection not ready'));
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async get_message_handler(message) {
    }

    _on_message(message) {
        this.decode(message.data).then(async decoded => {
            await this.get_message_handler(decoded)
        })
    }

    _on_open() {
        console.log('ws connected...')
        this.send_raw({ id: this.getUUID(), action: 'LIST_PENDING_MESSAGES' })
    }


    _on_error(e) {
        console.log('ws error...', e)
        this.start()
    }

    _on_close(e) {
        console.log('ws close...', e)
        this.start()
    }


    read_message(message) {
        this.send_raw({
            id: this.getUUID(),
            action: 'ACKNOWLEDGE_MESSAGE_RECEIPT',
            params: {
                message_id: message.data.message_id,
                status: 'READ'
            }
        })
    }

    decode(data) {
        return new Promise((resolve, reject) => {
            try {
                zlib.gunzip(data, (err, unzipped) => {
                    if (err) {
                        return reject(err);
                    }
                    const msgObj = JSON.parse(unzipped.toString());
                    if (msgObj && msgObj.action === 'CREATE_MESSAGE' && msgObj.data && msgObj.data.category === 'PLAIN_TEXT') {
                        msgObj.data.data = Buffer.from(msgObj.data.data, 'base64').toString('utf-8');
                    }
                    resolve(msgObj);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    send_text(text, message) {
        this.send_raw(this._create_message(text, message, 'PLAIN_TEXT'))
    }

    send_image(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_IMAGE'))
    }

    send_video(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_VIDEO'))
    }

    send_live(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_LIVE'))
    }

    send_file(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_DATA'))
    }

    send_sticker(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_STICKER'))
    }

    send_contact(obj, message) {
        this.send_raw(this._create_message(obj, message, 'PLAIN_CONTACT'))
    }

    send_buttons(obj, message) {
        obj = Array.isArray(obj) ? obj : [obj]
        this.send_raw(this._create_message(obj, message, 'APP_BUTTON_GROUP'))
    }

    send_app(obj, message) {
        this.send_raw(this._create_message(obj, message, 'APP_CARD'))
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

    send_message(data, message, type) {
        this.send_raw(this._create_message(data, message, type))
    }
}

module.exports = MixinSocket
