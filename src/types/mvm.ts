import { TransactionInput, Payment } from '.';

export interface ContractParams {
  address: string;
  method: string;
  types?: string[];
  values?: any[];
}

export interface PaymentGenerateParams {
  contract?: ContractParams;
  contracts?: ContractParams[];
  payment?: {
    asset?: string;
    amount?: string;
    trace?: string;
    type?: 'payment' | 'tx'; // payment or tx, default is payment
  };
}

export interface MvmClientRequest {
  // getMvmTransaction: (params: InvokeCodeParams) => Promise<TransactionInput>;
  paymentGeneratorByContract: (params: PaymentGenerateParams) => Promise<Payment | TransactionInput>;
}
