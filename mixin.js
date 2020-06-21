const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const { Uint64BE } = require('int64-buffer');
const crypto = require('crypto');


class MixinBase {
  constructor(config) {
    this.CLIENT_CONFIG = config
  }

  getJwtToken({ client_id: uid, session_id: sid, private_key: privateKey }, method, url, body) {
    return signAuthenticationToken(uid, sid, privateKey, method, url, body)
  }

  signPin(_pin) {
    let { pin, pin_token, session_id, private_key } = this.CLIENT_CONFIG
    if (_pin) pin = _pin
    return signEncryptedPin(pin, pin_token, session_id, private_key)
  }

  getUUID() {
    return _getUUID()
  }

  getConversationId(recipientId) {
    let userId = this.CLIENT_CONFIG.client_id.toString();
    recipientId = recipientId.toString();

    let [minId, maxId] = [userId, recipientId];
    if (minId > maxId) {
      [minId, maxId] = [recipientId, userId];
    }

    const hash = crypto.createHash('md5');
    hash.update(minId);
    hash.update(maxId);
    const bytes = hash.digest();

    bytes[6] = (bytes[6] & 0x0f) | 0x30;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // eslint-disable-next-line unicorn/prefer-spread
    const digest = Array.from(bytes, byte => `0${(byte & 0xff).toString(16)}`.slice(-2)).join('');
    const uuid = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(
      16,
      20
    )}-${digest.slice(20, 32)}`;
    return uuid;
  }
}

function _getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function signAuthenticationToken(uid, sid, privateKey, method, uri, body) {
  uri = uri.replace('https://api.mixin.one', '')
  method = method.toLocaleUpperCase();
  if (typeof (body) === "object") {
    body = JSON.stringify(body);
  }
  let issuedAt = Math.floor(Date.now() / 1000)
  let md = forge.md.sha256.create();
  md.update(method + uri + body, 'utf8');
  let payload = {
    uid: uid,
    sid: sid,
    iat: issuedAt,
    exp: issuedAt + 3600,
    jti: _getUUID(),
    sig: md.digest().toHex(),
    scp: 'FULL'
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS512' });
}


function signEncryptedPin(pin, pinToken, sessionId, privateKey, iterator) {
  const blockSize = 16;
  pinToken = Buffer.from(pinToken, 'base64');
  privateKey = forge.pki.privateKeyFromPem(privateKey);
  let pinKey = privateKey.decrypt(pinToken, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    label: sessionId
  });
  let time = new Uint64BE(Math.floor(Date.now() / 1000));
  time = [...time.toBuffer()].reverse();
  if (iterator == undefined || iterator === "") {
    iterator = Date.now() * 1000000;
  }
  iterator = new Uint64BE(iterator);
  iterator = [...iterator.toBuffer()].reverse();
  pin = Buffer.from(pin, 'utf8');
  let buf = Buffer.concat([pin, Buffer.from(time), Buffer.from(iterator)]);
  let padding = blockSize - buf.length % blockSize;
  let paddingArray = [];
  for (let i = 0; i < padding; i++) {
    paddingArray.push(padding);
  }
  buf = Buffer.concat([buf, Buffer.from(paddingArray)]);
  let iv16 = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv('aes-256-cbc', hexToBytes(forge.util.binary.hex.encode(pinKey)), iv16);
  cipher.setAutoPadding(false);
  let encrypted_pin_buff = cipher.update(buf, 'utf-8');
  encrypted_pin_buff = Buffer.concat([iv16, encrypted_pin_buff]);
  return Buffer.from(encrypted_pin_buff).toString('base64');
}


function hexToBytes(hex) {
  var bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return Buffer.from(bytes);
}


module.exports = MixinBase
