import { AxiosInstance } from 'axios';
import { getSignPIN } from '../mixin/sign';
import { AuthData, Keystore, OauthClientRequest, Scope } from '../types';
import { gzip, ungzip } from 'pako';
import WebSocket from 'ws';
export class OauthClient implements OauthClientRequest {
  keystore!: Keystore;
  request!: AxiosInstance;
  newUUID!: () => string;

  authorizeToken(code: string, client_secret?: string, code_verifier?: string): Promise<{ access_token: string; scope: string }> {
    if (!client_secret) client_secret = this.keystore.client_secret;
    if (!client_secret) return Promise.reject(new Error('client_secret required'));
    return this.request.post('/oauth/token', {
      client_secret,
      code,
      code_verifier,
      client_id: this.keystore.client_id,
    });
  }

  async getAuthorizeCode(params: { client_id: string; scopes?: Scope[]; pin?: string }): Promise<AuthData> {
    const { client_id, scopes: _scopes, pin } = params;
    const { authorization_id, scopes } = await this.getAuthorizeData(client_id, _scopes);
    const pin_base64 = getSignPIN(this.keystore, pin);
    return this.request.post('/oauth/authorize', { authorization_id, scopes, pin_base64 });
  }

  getAuthorizeData(client_id: string, _scope?: Scope[]): Promise<AuthData> {
    return new Promise((resolve, reject) => {
      let ws = new WebSocket('wss://blaze.mixin.one', 'Mixin-OAuth-1');
      if (!_scope) _scope = [];
      if (!_scope.includes('PROFILE:READ')) _scope.push('PROFILE:READ');
      const scope = _scope?.join(' ');
      const sendRefreshCode = (authorization_id = '') => {
        ws.send(
          gzip(
            JSON.stringify({
              id: this.newUUID().toUpperCase(),
              action: 'REFRESH_OAUTH_CODE',
              params: { client_id, scope, authorization_id, code_challenge: '' },
            }),
          ),
        );
      };

      ws.addEventListener('message', event => {
        const msg = ungzip(event.data, { to: 'string' });
        const authorization: { data: AuthData } = JSON.parse(msg);
        ws.close();
        if (!authorization.data) {
          return reject(authorization);
        }
        return resolve(authorization.data);
      });

      ws.addEventListener('open', () => sendRefreshCode());
    });
  }
}
