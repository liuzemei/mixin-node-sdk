const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const { Int64BE } = require('int64-buffer');
const crypto = require('crypto');
const crypto_scalarmult = require('./ed25519')
class MixinBase {
  constructor(config) {
    this.CLIENT_CONFIG = config
  }

  getJwtToken({ client_id: uid, session_id: sid, private_key: privateKey }, method, url, body, scp) {
    return signAuthenticationToken(uid, sid, privateKey, method, url, body, scp)
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

function signAuthenticationToken(uid, sid, privateKey, method, uri, body, scp) {
  if (uri.startsWith('https://api.mixin.one')) uri = uri.replace('https://api.mixin.one', '')
  if (uri.startsWith('https://mixin-api.zeromesh.net')) uri = uri.replace('https://mixin-api.zeromesh.net', '')
  method = method.toLocaleUpperCase();
  if (typeof (body) === "object") body = JSON.stringify(body);
  let issuedAt = Math.floor(Date.now() / 1000)
  let md = forge.md.sha256.create();
  let _privateKey = toBuffer(privateKey, 'base64');
  md.update(method + uri + body, 'utf8');
  let payload = {
    uid: uid,
    sid: sid,
    iat: issuedAt,
    exp: issuedAt + 3600,
    jti: _getUUID(),
    sig: md.digest().toHex(),
    scp: scp || 'FULL'
  };
  return _privateKey.length === 64 ? getEd25519Sign(payload, _privateKey) : jwt.sign(payload, privateKey, { algorithm: 'RS512' });
}

function getEd25519Sign(payload, privateKey) {
  const header = toBuffer({ alg: "EdDSA", typ: "JWT" }).toString('base64')
  payload = base64url(toBuffer(payload))
  const result = [header, payload]
  const sign = base64url(forge.pki.ed25519.sign({
    message: result.join('.'),
    encoding: 'utf8',
    privateKey
  }))
  result.push(sign)
  return result.join('.')
}

function toBuffer(content, encoding = 'utf8') {
  if (typeof content === 'object') content = JSON.stringify(content)
  return Buffer.from(content, encoding)
}

function base64url(buffer) {
  return buffer.toString('base64').replace(/\=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}


function signEncryptedPin(pin, pinToken, sessionId, privateKey, iterator) {
  const blockSize = 16;

  let _privateKey = toBuffer(privateKey, 'base64');
  let pinKey = _privateKey.length === 64 ? signEncryptEd25519PIN(pinToken, _privateKey) : signPin(pinToken, privateKey, sessionId)

  let time = new Int64BE(Date.now() / 1000 | 0);
  time = [...time.toBuffer()].reverse();
  if (iterator == undefined || iterator === "") {
    iterator = Date.now() * 1000000;
  }
  iterator = new Int64BE(iterator);
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
  let cipher = crypto.createCipheriv('aes-256-cbc', pinKey, iv16);
  cipher.setAutoPadding(false);
  let encrypted_pin_buff = cipher.update(buf, 'utf-8');
  encrypted_pin_buff = Buffer.concat([iv16, encrypted_pin_buff]);
  return Buffer.from(encrypted_pin_buff).toString('base64');
}


function signPin(pinToken, privateKey, sessionId) {
  pinToken = Buffer.from(pinToken, 'base64');
  privateKey = forge.pki.privateKeyFromPem(privateKey);
  let pinKey = privateKey.decrypt(pinToken, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    label: sessionId
  });
  return hexToBytes(forge.util.binary.hex.encode(pinKey))
}

function signEncryptEd25519PIN(pinToken, privateKey) {
  pinToken = Buffer.from(pinToken, 'base64')
  return scalarMult(privateKeyToCurve25519(privateKey), pinToken.slice(0, 32))
}

function scalarMult(curvePriv, publicKey) {
  curvePriv[0] &= 248
  curvePriv[31] &= 127
  curvePriv[31] |= 64
  var sharedKey = new Uint8Array(32);
  crypto_scalarmult(sharedKey, curvePriv, publicKey);
  return sharedKey;
}

function privateKeyToCurve25519(privateKey) {
  const seed = privateKey.slice(0, 32)
  const sha512 = crypto.createHash('sha512')
  sha512.write(seed, 'binary')
  let digest = sha512.digest()
  digest[0] &= 248
  digest[31] &= 127
  digest[31] |= 64
  return digest.slice(0, 32)
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(32);
  let i = 0
  for (let c = 0; c < hex.length; c += 2) {
    bytes[i++] = parseInt(hex.substr(c, 2), 16)
  }
  return bytes
}

module.exports = MixinBase
