import { SHA3 } from 'sha3';
import https from 'https';

export const delay = (n = 500) =>
  new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, n);
  });

export function toBuffer(content: any, encoding: any = 'utf8') {
  if (typeof content === 'object') {
    content = JSON.stringify(content);
  }
  return Buffer.from(content, encoding);
}

export const hashMember = (ids: string[]) => newHash(ids.sort((a, b) => (a > b ? 1 : -1)).join(''));

export const newHash = (str: string) => new SHA3(256).update(str).digest('hex');

export const getFileByURL = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data: any[] = [];
        res.on('data', chunk => {
          data.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(data);
          resolve(buffer);
        });
      })
      .on('error', err => {
        reject(err);
      });
  });
};
