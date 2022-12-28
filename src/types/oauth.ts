import { App } from './app';
import { User } from './user';

export type Scope =
  | 'PROFILE:READ'
  | 'ASSETS:READ'
  | 'PHONE:READ'
  | 'CONTACTS:READ'
  | 'MESSAGES:REPRESENT'
  | 'SNAPSHOTS:READ'
  | 'CIRCLES:READ'
  | 'CIRCLES:WRITE'
  | 'COLLECTIBLES:READ'
  | 'STICKER:READ';

export interface AuthData {
  code_id: string;
  authorization_code: string;
  authorization_id: string;
  scopes: string[];
  user: User;
  app: App;
  created_at: string;
}

export interface OauthClientRequest {
  authorizeToken: (code: string, client_secret?: string, code_verifier?: string) => Promise<{ access_token: string; scope: string }>;
  getAuthorizeCode: (params: { client_id: string; scopes?: Scope[]; pin?: string }) => Promise<AuthData>;
}
