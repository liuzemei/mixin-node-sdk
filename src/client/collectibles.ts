import { SHA3 } from 'sha3'
import { AxiosInstance } from "axios"
import { getSignPIN } from "../mixin/sign"
import { BigNumber } from 'bignumber.js'
import {
  Keystore,
  CollectiblesClientRequest, CollectiblesRequest, CollectiblesUTXO,
  CollectiblesAction, RawTransactionInput, Transaction, GhostInput, GhostKeys,
} from "../types"
import { dumpTransaction } from '../mixin/dump_transacion'

const TxVersion = 0x02

const OperatorSum = 0xfe
const OperatorCmp = 0xff

export class CollectiblesClient implements CollectiblesClientRequest {
  keystore!: Keystore
  request!: AxiosInstance
  readGhostKeys!: (receivers: string[], index: number) => Promise<GhostKeys>
  batchReadGhostKeys!: (inputs: GhostInput[]) => Promise<GhostKeys[]>

  readCollectible(id: string): Promise<CollectiblesUTXO[]> {
    return this.request.get(`/collectibles/tokens/${id}`)
  }
  readCollectibleOutputs(members: string[], threshold: number, offset: string, limit: number): Promise<CollectiblesUTXO[]> {
    if (members.length > 0 && threshold < 1 || threshold > members.length) return Promise.reject(new Error("Invalid threshold or members"))
    const params: any = { threshold: Number(threshold), offset, limit }
    params.members = hashMember(members)
    return this.request.get(`/collectibles/outputs`, { params })
  }
  createCollectible(action: CollectiblesAction, raw: string): Promise<CollectiblesRequest> {
    return this.request.post(`/collectibles/requests`, { action, raw })
  }
  signCollectible(request_id: string, pin?: string): Promise<CollectiblesRequest> {
    pin = getSignPIN(this.keystore, pin)
    return this.request.post(`/collectibles/requests/${request_id}/sign`, { pin })
  }
  cancelCollectible(request_id: string): Promise<void> {
    return this.request.post(`/collectibles/requests/${request_id}/cancel`)
  }
  unlockCollectible(request_id: string, pin: string): Promise<void> {
    pin = getSignPIN(this.keystore, pin)
    return this.request.post(`/collectibles/requests/${request_id}/unlock`, { pin })
  }
  async makeCollectiblesTransaction(txInput: RawTransactionInput): Promise<string> {
    // validate ...
    let { inputs, memo, outputs } = txInput
    const tx: Transaction = {
      version: TxVersion,
      asset: newHash(inputs[0].asset_id),
      extra: Buffer.from(memo).toString('base64'),
      inputs: [],
      outputs: []
    }
    // add input
    for (const input of inputs) {
      tx.inputs!.push({
        hash: input.transaction_hash,
        index: input.output_index
      })
    }
    let change = inputs.reduce((sum, input) => sum.plus(input.amount), new BigNumber(0))
    for (const output of outputs) change = change.minus(output.amount)
    if (change.isGreaterThan(0)) outputs.push({ receivers: inputs[0].members, threshold: inputs[0].threshold, amount: change.toString() })
    const ghostInputs: GhostInput[] = []
    outputs.forEach((output, idx) => ghostInputs.push({ receivers: output.receivers, index: idx, hint: txInput.hint }))
    // get ghost keys
    let ghosts = await this.batchReadGhostKeys(ghostInputs)
    outputs.forEach((output, idx) => {
      const { mask, keys } = ghosts[idx]
      tx.outputs!.push({
        mask,
        keys,
        amount: Number(output.amount).toFixed(8),
        script: Buffer.from([OperatorCmp, OperatorSum, output.threshold]).toString('hex')
      })
    })
    return dumpTransaction(tx)
  }
}

function hashMember(ids: string[]) {
  ids = ids.sort((a, b) => a > b ? 1 : -1)
  return newHash(ids.join(''))
}

function newHash(str: string) {
  return new SHA3(256).update(str).digest('hex')
}