import { Asset } from './asset'
export interface Snapshot {
  snapshot_id: string
  created_at: string
  trace_id: string
  user_id: string
  asset_id: string
  chain_id: string
  opponent_id: string
  source: string
  amount: string
  opening_balance: string
  closing_balance: string
  memo: string
  type: string
  sender: string
  receiver: string
  transaction_hash: string

  asset?: Asset
  data?: string
}


export interface SnapshotClientRequest {
  ReadSnapshots(asset_id?: string, offset?: string, order?: string, limit?: number): Promise<Snapshot[]>
  ReadNetworkSnapshots(asset_id?: string, offset?: string, order?: string, limit?: number): Promise<Snapshot[]>
  ReadSnapshot(snapshot_id: string): Promise<Snapshot>
  ReadNetworkSnapshot(snapshot_id: string): Promise<Snapshot>
}

export interface SnapshotRequest {
  ReadSnapshots(token: string, asset_id?: string, offset?: string, order?: string, limit?: number): Promise<Snapshot[]>
  ReadSnapshot(token: string, snapshot_id: string): Promise<Snapshot>
}