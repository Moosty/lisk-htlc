import { Account } from '@liskhq/lisk-transactions';

export interface HTLCConfig {
    fee?: string;
}

export interface ContractAsset {
    readonly recipientPublicKey: string;
    readonly senderPublicKey: string;
    readonly amount: string;
    readonly time: number;
    readonly hash: string;
    readonly type: string;
    readonly length: number;
    readonly key?: string;
    readonly timedOut?: boolean;
}

export interface Contract extends Account {
    readonly asset: ContractAsset;
}

export interface HTLCLockAsset {
    readonly contractId: string;
    readonly recipientPublicKey: string;
    readonly amount: bigint;
    readonly type: string;
    readonly time: number;
    readonly data: string;
    readonly secretLength: number;
}

export interface HTLCUnlockAsset {
    readonly contractId: string;
    readonly secret: string;
}

export interface HTLCRefundAsset {
    readonly contractId: string;
    readonly data: string;
}

export interface HTLCLockTransaction {
    readonly asset: HTLCLockAsset;
    readonly id: string;
    readonly blockId?: string;
    readonly height?: number;
    readonly confirmations?: number;
    readonly senderPublicKey: string;
    readonly signature?: string;
    readonly signatures?: ReadonlyArray<string>;
    readonly signSignature?: string;
    readonly timestamp: number;
    readonly type: number;
    readonly receivedAt?: string;
    readonly senderId?: string;
    readonly networkIdentifier?: string;
}

export interface HTLCUnlockTransaction {
    readonly asset: HTLCUnlockAsset;
    readonly id: string;
    readonly blockId?: string;
    readonly height?: number;
    readonly confirmations?: number;
    readonly senderPublicKey: string;
    readonly signature?: string;
    readonly signatures?: ReadonlyArray<string>;
    readonly signSignature?: string;
    readonly timestamp: number;
    readonly type: number;
    readonly receivedAt?: string;
    readonly senderId?: string;
    readonly networkIdentifier?: string;
}

export interface HTLCRefundTransaction {
    readonly asset: HTLCRefundAsset;
    readonly id: string;
    readonly blockId?: string;
    readonly height?: number;
    readonly confirmations?: number;
    readonly senderPublicKey: string;
    readonly signature?: string;
    readonly signatures?: ReadonlyArray<string>;
    readonly signSignature?: string;
    readonly timestamp: number;
    readonly type: number;
    readonly receivedAt?: string;
    readonly senderId?: string;
    readonly networkIdentifier?: string;
}
