import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { AxiosInstance } from 'axios';
import { mixinRequest, request } from '../services/request';
import { UserClient } from './user';
import { AddressClient } from './address';
import {
  AddressClientRequest,
  AddressCreateParams,
  Address,
  AppClientRequest,
  UpdateAppRequest,
  App,
  FavoriteApp,
  AssetClientRequest,
  Asset,
  ExchangeRate,
  NetworkTicker,
  Attachment,
  AttachmentClientRequest,
  CollectiblesParams,
  CollectibleToken,
  CollectibleAction,
  CollectibleRequest,
  CollectibleOutput,
  RawCollectibleInput,
  ConversationClientRequest,
  ConversationCreateParams,
  Conversation,
  ConversationUpdateParams,
  Participant,
  ConversationAction,
  MessageClientRequest,
  AcknowledgementRequest,
  MessageRequest,
  MessageView,
  ImageMessage,
  DataMessage,
  StickerMessage,
  ContactMessage,
  AppCardMessage,
  AudioMessage,
  LiveMessage,
  LocationMessage,
  VideoMessage,
  AppButtonMessage,
  RecallMessage,
  TransactionInput,
  RawTransactionInput,
  MultisigClientRequest,
  MultisigRequest,
  MultisigUTXO,
  PINClientRequest,
  Turn,
  SnapshotClientRequest,
  Snapshot,
  SnapshotQuery,
  TransferClientRequest,
  TransferInput,
  Payment,
  GhostInput,
  GhostKeys,
  WithdrawInput,
  RawTransaction,
  UserClientRequest,
  User,
  UserRelationship,
  Keystore,
  MvmClientRequest,
  PaymentGenerateParams,
  OauthClientRequest,
  AuthData,
  Scope,
  EncryptMessageView,
  Session,
} from '../types';
import { AppClient } from './app';
import { AssetClient } from './asset';
import { AttachmentClient } from './attachment';
import { ConversationClient } from './conversation';
import { MessageClient } from './message';
import { MultisigsClient } from './multisigs';
import { PINClient } from './pin';
import { SnapshotClient } from './snapshot';
import { TransferClient } from './transfer';
import { OauthClient } from './oauth';

export { verifyPayment } from './transfer';
import { CollectiblesClient } from './collectibles';
import { MvmClient } from './mvm';

export * from './mvm';

export class Client
  implements
    AddressClientRequest,
    AppClientRequest,
    AssetClientRequest,
    AttachmentClientRequest,
    CollectiblesClient,
    ConversationClientRequest,
    MessageClientRequest,
    MultisigClientRequest,
    PINClientRequest,
    SnapshotClientRequest,
    TransferClientRequest,
    UserClientRequest,
    MvmClientRequest,
    OauthClientRequest
{
  request: AxiosInstance;
  keystore: Keystore;

  constructor(keystore?: Keystore, token?: string) {
    if (!keystore && !token) throw new Error('keystore or token required');
    this.keystore = keystore!;
    this.request = request(keystore, token);
  }

  // Address...
  createAddress!: (params: AddressCreateParams, pin?: string) => Promise<Address>;
  readAddress!: (address_id: string) => Promise<Address>;
  readAddresses!: (asset_id: string) => Promise<Address[]>;
  deleteAddress!: (address_id: string, pin?: string) => Promise<void>;

  // App...
  updateApp!: (appID: string, params: UpdateAppRequest) => Promise<App>;
  readFavoriteApps!: (userID: string) => Promise<FavoriteApp[]>;
  favoriteApp!: (appID: string) => Promise<FavoriteApp>;
  unfavoriteApp!: (appID: string) => Promise<void>;

  // Asset...
  readAsset!: (asset_id: string) => Promise<Asset>;
  readAssets!: () => Promise<Asset[]>;
  readAssetFee!: (asset_id: string) => Promise<number>;
  readAssetNetworkTicker!: (asset_id: string, offset?: string) => Promise<NetworkTicker>;

  readExchangeRates!: () => Promise<ExchangeRate[]>;

  // Attachment...
  createAttachment!: () => Promise<Attachment>;
  showAttachment!: (attachment_id: string) => Promise<Attachment>;
  uploadFile!: (file: File) => Promise<Attachment>;

  // Collectibles...
  newMintCollectibleTransferInput!: (p: CollectiblesParams) => TransactionInput;

  readCollectibleToken!: (id: string) => Promise<CollectibleToken>;
  readCollectibleOutputs!: (members: string[], threshold: number, offset: string, limit: number) => Promise<CollectibleOutput[]>;
  makeCollectibleTransactionRaw!: (txInput: RawCollectibleInput) => Promise<string>;
  createCollectibleRequest!: (action: CollectibleAction, raw: string) => Promise<CollectibleRequest>;
  signCollectibleRequest!: (requestId: string, pin?: string) => Promise<CollectibleRequest>;
  cancelCollectibleRequest!: (requestId: string) => Promise<void>;
  unlockCollectibleRequest!: (requestId: string, pin?: string) => Promise<void>;

  // Conversation...
  createConversation!: (params: ConversationCreateParams) => Promise<Conversation>;
  updateConversation!: (conversationID: string, params: ConversationUpdateParams) => Promise<Conversation>;
  createContactConversation!: (userID: string) => Promise<Conversation>;
  createGroupConversation!: (conversationID: string, name: string, participant: Participant[]) => Promise<Conversation>;
  readConversation!: (conversationID: string) => Promise<Conversation>;
  managerConversation!: (conversationID: string, action: ConversationAction, participant: Participant[]) => Promise<Conversation>;
  addParticipants!: (conversationID: string, userIDs: string[]) => Promise<Conversation>;
  removeParticipants!: (conversationID: string, userIDs: string[]) => Promise<Conversation>;
  adminParticipants!: (conversationID: string, userIDs: string[]) => Promise<Conversation>;
  rotateConversation!: (conversationID: string) => Promise<Conversation>;

  // Message...
  sendAcknowledgements!: (messages: AcknowledgementRequest[]) => Promise<void>;
  sendAcknowledgement!: (message: AcknowledgementRequest) => Promise<void>;
  sendMessage!: (message: MessageRequest) => Promise<MessageView>;
  sendMessages!: (messages: MessageRequest[]) => Promise<undefined>;
  sendMessageText!: (userID: string, text: string) => Promise<MessageView>;
  sendMessagePost!: (userID: string, text: string) => Promise<MessageView>;
  sendTextMsg!: (userID: string, text: string) => Promise<MessageView>;
  sendPostMsg!: (userID: string, text: string) => Promise<MessageView>;
  sendImageMsg!: (userID: string, image: ImageMessage) => Promise<MessageView>;
  sendDataMsg!: (userID: string, data: DataMessage) => Promise<MessageView>;
  sendStickerMsg!: (userID: string, sticker: StickerMessage) => Promise<MessageView>;
  sendContactMsg!: (userID: string, contact: ContactMessage) => Promise<MessageView>;
  sendAppCardMsg!: (userID: string, appCard: AppCardMessage) => Promise<MessageView>;
  sendAudioMsg!: (userID: string, audio: AudioMessage) => Promise<MessageView>;
  sendLiveMsg!: (userID: string, live: LiveMessage) => Promise<MessageView>;
  sendVideoMsg!: (userID: string, video: VideoMessage) => Promise<MessageView>;
  sendLocationMsg!: (userID: string, location: LocationMessage) => Promise<MessageView>;
  sendAppButtonMsg!: (userID: string, appButton: AppButtonMessage[]) => Promise<MessageView>;
  sendRecallMsg!: (userID: string, message: RecallMessage) => Promise<MessageView>;

  sendEncryptMessage!: (message: MessageRequest) => Promise<EncryptMessageView>;
  sendEncryptMessages!: (messages: MessageRequest[]) => Promise<EncryptMessageView[]>;
  sendEncryptTextMsg!: (userID: string, text: string) => Promise<EncryptMessageView>;
  sendEncryptPostMsg!: (userID: string, text: string) => Promise<EncryptMessageView>;
  sendEncryptImageMsg!: (userID: string, image: ImageMessage) => Promise<EncryptMessageView>;
  sendEncryptDataMsg!: (userID: string, data: DataMessage) => Promise<EncryptMessageView>;
  sendEncryptStickerMsg!: (userID: string, sticker: StickerMessage) => Promise<EncryptMessageView>;
  sendEncryptContactMsg!: (userID: string, contact: ContactMessage) => Promise<EncryptMessageView>;
  sendEncryptAudioMsg!: (userID: string, audio: AudioMessage) => Promise<EncryptMessageView>;
  sendEncryptLiveMsg!: (userID: string, live: LiveMessage) => Promise<EncryptMessageView>;
  sendEncryptVideoMsg!: (userID: string, video: VideoMessage) => Promise<EncryptMessageView>;
  sendEncryptLocationMsg!: (userID: string, location: LocationMessage) => Promise<EncryptMessageView>;

  getSessions!: (userIDs: string[]) => Promise<Session[]>;

  // Multisigs...
  readMultisigs!: (offset: string, limit: number) => Promise<MultisigUTXO[]>;
  readMultisigOutput!: (id: string) => Promise<MultisigUTXO>;
  readMultisigOutputs!: (members: string[], threshold: number, offset: string, limit: number) => Promise<MultisigUTXO[]>;
  createMultisig!: (action: string, raw: string) => Promise<MultisigRequest>;
  signMultisig!: (request_id: string, pin?: string) => Promise<MultisigRequest>;
  cancelMultisig!: (request_id: string) => Promise<void>;
  unlockMultisig!: (request_id: string, pin?: string) => Promise<void>;
  sendRawTransaction!: (raw: string) => Promise<{ hash: string }>;
  readGhostKeys!: (receivers: string[], index: number) => Promise<GhostKeys>;
  batchReadGhostKeys!: (inputs: GhostInput[]) => Promise<GhostKeys[]>;
  makeMultisignTransaction!: (txInput: RawTransactionInput) => Promise<string>;

  // Mvm...
  paymentGeneratorByContract!: (params: PaymentGenerateParams) => Promise<Payment | TransactionInput>;

  // Pin...
  verifyPin!: (pin: string) => Promise<void>;
  modifyPin!: (pin: string, oldPin?: string) => Promise<void>;
  readTurnServers!: () => Promise<Turn[]>;

  // Snapshot...
  readSnapshots!: (params?: SnapshotQuery) => Promise<Snapshot[]>;
  readNetworkSnapshots!: (params?: SnapshotQuery) => Promise<Snapshot[]>;
  readSnapshot!: (snapshot_id: string) => Promise<Snapshot>;
  readNetworkSnapshot!: (snapshot_id: string) => Promise<Snapshot>;

  // Transfer...
  verifyPayment!: (params: TransferInput | TransactionInput) => Promise<Payment>;
  transfer!: (params: TransferInput, pin?: string) => Promise<Snapshot>;
  readTransfer!: (trace_id: string) => Promise<Snapshot>;
  transaction!: (params: TransactionInput, pin?: string) => Promise<RawTransaction>;
  withdraw!: (params: WithdrawInput, pin?: string) => Promise<Snapshot>;

  // User...
  userMe!: () => Promise<User>;
  readUser!: (userIdOrIdentityNumber: string) => Promise<User>;
  readUsers!: (userIDs: string[]) => Promise<User[]>;
  searchUser!: (identityNumberOrPhone: string) => Promise<User>;
  readFriends!: () => Promise<User[]>;
  createUser!: (full_name: string, session_secret?: string) => Promise<User>;
  modifyProfile!: (full_name?: string, avatar_base64?: string) => Promise<User>;
  modifyRelationships!: (relationship: UserRelationship) => Promise<User>;
  readBlockUsers!: () => Promise<User[]>;

  // Oauth...
  authorizeToken!: (code: string, client_secret?: string, code_verifier?: string) => Promise<{ access_token: string; scope: string }>;
  getAuthorizeCode!: (params: { client_id: string; scopes?: Scope[]; pin?: string }) => Promise<AuthData>;

  newUUID(): string {
    return uuid();
  }

  uniqueConversationID(userID: string, recipientID: string): string {
    let [minId, maxId] = [userID, recipientID];
    if (minId > maxId) {
      [minId, maxId] = [recipientID, userID];
    }

    const hash = crypto.createHash('md5');
    hash.update(minId);
    hash.update(maxId);
    const bytes = hash.digest();

    bytes[6] = (bytes[6] & 0x0f) | 0x30;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const digest = Array.from(bytes, byte => `0${(byte & 0xff).toString(16)}`.slice(-2)).join('');
    return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
  }
}

[
  AddressClient,
  AppClient,
  AssetClient,
  AttachmentClient,
  ConversationClient,
  MessageClient,
  MultisigsClient,
  PINClient,
  SnapshotClient,
  TransferClient,
  UserClient,
  CollectiblesClient,
  MvmClient,
  OauthClient,
].forEach(client => _extends(Client, client));

function _extends(origin: any, target: any) {
  for (const key in target.prototype) {
    origin.prototype[key] = target.prototype[key];
  }
}

export const authorizeToken = (client_id: string, code: string, client_secret: string, code_verifier?: string): Promise<{ access_token: string; scope: string }> =>
  mixinRequest.post('/oauth/token', {
    client_id,
    code,
    code_verifier,
    client_secret,
  });
