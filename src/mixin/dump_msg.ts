import { Session } from '../types';
import { v4 as uuid, parse as uuidParse } from 'uuid';
import { scalarMult } from 'tweetnacl';
import crypto from 'crypto';
import { Point } from '@noble/ed25519';

export function privateKeyToCurve25519(privateKey: Buffer) {
  const h = crypto.createHash('sha512');
  h.update(privateKey.subarray(0, 32));
  const digest = h.digest();

  digest[0] &= 248;
  digest[31] &= 127;
  digest[31] |= 64;

  return digest.subarray(0, 32);
}

export function generateUserCheckSum(_sessions: Session[]): string {
  const sessions = _sessions.map(v => v.session_id);
  sessions.sort();
  const md5 = crypto.createHash('md5');
  for (const session of sessions) md5.update(session);
  return md5.digest('hex');
}

export function decryptMessageData(_data: string, sessionID: string, _privateKey: string): string {
  const data = Buffer.from(_data, 'base64');
  const privateKey = Buffer.from(_privateKey, 'base64');
  const size = 16 + 48;
  const total = data.length;
  if (total < 1 + 2 + 32 + size + 12) throw new Error('invalid data size');
  const sessionLen = data.readUInt16LE(1);
  const prefixSize = 35 + sessionLen * size;
  let key = Buffer.alloc(0);
  for (let i = 35; i < prefixSize; i += size) {
    const uid = uuid({ random: data.subarray(i, i + 16) });
    if (uid === sessionID) {
      const pub = data.subarray(3, 35);
      const priv = privateKeyToCurve25519(privateKey);
      const dst = scalarMult(priv, pub);
      const iv = data.subarray(i + 16, i + 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', dst, iv);
      key = data.subarray(i + 32, i + size);
      key = decipher.update(key);
      key = Buffer.concat([key, decipher.final()]);
      break;
    }
  }
  if (key.length !== 16) throw new Error('session id not found');
  const nonce = data.subarray(prefixSize, prefixSize + 12);
  const decipher = crypto.createDecipheriv('aes-128-gcm', key, nonce);
  decipher.setAuthTag(data.subarray(total - 16));
  let raw = decipher.update(data.subarray(prefixSize + 12, total - 16));
  raw = Buffer.concat([raw, decipher.final()]);
  return raw.toString('base64');
}

export const encryptMessageData = (data: Buffer, sessions: Session[], privateKey: Buffer): string => {
  let key = crypto.randomBytes(16);
  let nonce = crypto.randomBytes(12);
  let cipher = crypto.createCipheriv('aes-128-gcm', key, nonce);
  const firstBlock = cipher.update(data);
  const lastBlock = cipher.final();
  const authTag = cipher.getAuthTag();
  let cipherText = Buffer.concat([firstBlock, lastBlock, authTag]);
  let sessionLen = Buffer.alloc(2);
  sessionLen.writeUInt16LE(sessions.length);
  let pub = Point.fromHex(privateKey.subarray(32)).toX25519();
  let sessionsBytes = Buffer.from([]);
  for (let s of sessions) {
    let clientPub = Buffer.from(s.public_key!, 'base64');
    const priv = privateKeyToCurve25519(privateKey);
    const dst = scalarMult(priv, clientPub);
    const iv = crypto.randomBytes(16);
    const padText = Buffer.alloc(16).fill(16);
    const shared = Buffer.concat([key, padText]);
    const cipherText = Buffer.alloc(16 + shared.length);
    cipherText.set(iv, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', dst, iv);
    let enc = cipher.update(shared);
    cipherText.set(enc, 16);
    const id = uuidParse(s.session_id);
    sessionsBytes = Buffer.concat([sessionsBytes, id as Buffer, cipherText]);
  }
  let result = Buffer.from([1]);
  result = Buffer.concat([result, sessionLen, pub, sessionsBytes, nonce, cipherText]);
  return result.toString('base64url');
};

export const decryptAttachment = (data: Buffer, _keys: string) => {
  const aesKey = Buffer.from(_keys, 'base64').subarray(0, 32);
  const iv = data.subarray(0, 16);
  let cipherText = data.subarray(16, data.byteLength - 32);

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  cipherText = decipher.update(cipherText);
  cipherText = Buffer.concat([cipherText, decipher.final()]);
  return cipherText;
};
