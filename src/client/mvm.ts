import { TransactionInput, ContractParams, PaymentGenerateParams, MvmClientRequest, Payment, TransferInput } from '../types';
import { parse, stringify } from 'uuid';
import { Encoder } from '../mixin/encoder';
import { base64url } from '../mixin/sign';
import { BigNumber, ethers, utils } from 'ethers';
import { mvmRPCUri, registryAddress, registryProcess, registryAbi } from '../mixin/mvm';
// import axios from 'axios';

// const OperationPurposeUnknown = 0
const OperationPurposeGroupEvent = 1;
// const OperationPurposeAddProcess = 11
// const OperationPurposeCreditProcess = 12

// const mvmClient = axios.create({
//   baseURL: 'https://api.test.mvm.dev',
// });

const receivers = [
  'd5a3a450-5619-47af-a3b1-aad08e6e10dd',
  '9d4a18aa-9b0a-40ed-ba57-ce8fbbbc6deb',
  '2f82a56a-7fae-4bdd-bc4d-aad5005c5041',
  'f7f33be1-399a-4d29-b50c-44e5f01cbb1b',
  '23a070df-6b87-4b66-bdd4-f009702770c9',
  '2385639c-eac1-4a38-a7f6-597b3f0f5b59',
  'ab357ad7-8828-4173-b3bb-0600c518eab2',
];
const threshold = 5;

const CNBAssetID = '965e5c6e-434c-3fa9-b780-c50f43cd955c';
const MinAmount = '0.00000001';
export const getContractByAssetID = (id: string): Promise<string> => getRegistryContract().contracts('0x' + Buffer.from(parse(id) as Buffer).toString('hex'));

export const getContractByUserIDs = (ids: string | string[], threshold?: number): Promise<string> => {
  if (typeof ids === 'string') ids = [ids];
  if (!threshold) threshold = ids.length;
  const encoder = new Encoder(Buffer.from([]));
  encoder.writeInt(ids.length);
  ids.forEach(id => encoder.writeUUID(id));
  encoder.writeInt(threshold);
  return getRegistryContract().contracts(utils.keccak256('0x' + encoder.buf.toString('hex')));
};

export const getAssetIDByAddress = async (contract_address: string): Promise<string> => {
  const registry = getRegistryContract();
  let res = await registry.assets(contract_address);
  res instanceof BigNumber && (res = res._hex);
  if (res.length <= 2) return '';
  res = res.slice(2);
  return stringify(Buffer.from(res, 'hex'));
};

export const getUserIDByAddress = async (contract_address: string): Promise<string> => {
  const registry = getRegistryContract();
  let res = await registry.users(contract_address);
  res instanceof BigNumber && (res = res._hex);
  if (res.length <= 2) return '';
  res = res.slice(6);
  res = res.slice(0, 32);
  return stringify(Buffer.from(res, 'hex'));
};

const getRegistryContract = (address = registryAddress) => new ethers.Contract(address, registryAbi, new ethers.providers.JsonRpcProvider(mvmRPCUri));

const getMethodIdByAbi = (methodName: string, types: string[]): string => utils.id(methodName + '(' + types.join(',') + ')').slice(2, 10);

const encodeMemo = (extra: string, process: string): string => {
  if (extra.startsWith('0x')) extra = extra.slice(2);
  const enc = new Encoder(Buffer.from([]));
  enc.writeInt(OperationPurposeGroupEvent);
  enc.writeUUID(process);
  enc.writeBytes(Buffer.from([]));
  enc.writeBytes(Buffer.from([]));
  enc.writeBytes(Buffer.from(extra, 'hex'));
  return base64url(enc.buf);
};

// address
const getSingleExtra = ({ address, method, types = [], values = [] }: ContractParams) => {
  if (types.length !== values.length) return '';

  let addr = address.toLocaleLowerCase();
  if (addr.startsWith('0x')) addr = addr.slice(2);
  let contractInput = getMethodIdByAbi(method, types);
  if (types.length != values.length) throw new Error('error: types.length!=values.length');
  if (values.length > 0) {
    const abiCoder = new ethers.utils.AbiCoder();
    contractInput += abiCoder.encode(types, values).slice(2);
  }

  const inputLength = Buffer.from([0, contractInput.length / 2]).toString('hex');
  const extra = `${addr}${inputLength}${contractInput}`;
  return extra;
};

/**  Get extra for multiple contracts calling, started with number of contracts to be called */
const getExtra = (contracts: ContractParams[]) => {
  if (contracts.length === 0) return '';
  let extra = Buffer.from([0, contracts.length]).toString('hex');

  for (let i = 0; i < contracts.length; i++) {
    const singleExtra = Buffer.from(getSingleExtra(contracts[i]));
    extra += singleExtra;
  }

  return '0x' + extra;
};

export class MvmClient implements MvmClientRequest {
  newUUID!: () => string;
  verifyPayment!: (params: TransferInput | TransactionInput) => Promise<Payment>;
  async paymentGeneratorByContract(params: PaymentGenerateParams): Promise<Payment | TransactionInput> {
    if (!params.contract && !params.contracts) throw new Error('error: contract or contracts is required');
    if (params.contract) params.contracts = [params.contract];
    const extra = getExtra(params.contracts!);
    const { asset, amount, trace, type = 'payment' } = params.payment || {};
    let memo = encodeMemo(extra, registryProcess).slice(2);
    const txInput = {
      asset_id: asset || CNBAssetID,
      amount: amount || MinAmount,
      trace_id: trace || this.newUUID(),
      memo,
      opponent_multisig: { receivers, threshold },
    };
    // if (memo.length > 200) {
    //   // 上传的memo太长，则截取前200个字符
    //   txInput.memo = extra;
    //   const data = await mvmClient.post(`/payments`, txInput);
    //   console.log(data);
    //   return data.data;
    // }
    if (type === 'tx') return txInput;
    if (type === 'payment') return this.verifyPayment(txInput);
    throw new Error('error: type is invalid. type should be tx or payment');
  }
}
