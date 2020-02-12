import { getAddressFromPublicKey } from "@liskhq/lisk-cryptography";
import { TransactionError } from "@liskhq/lisk-transactions";
import * as crypto from 'crypto';
import RIPEMD160 from 'ripemd160';
import { HTLCLockAsset } from "./interfaces";
import {EPOCH_TIME_MILLISECONDS, MS_FACTOR} from './constants';

export const verifyContractAddress = (id: string, asset: HTLCLockAsset, sender: string): TransactionError | undefined => {
    if (asset.type && getContractAddress(asset, sender) !== asset.contractId) {
        return new TransactionError(
            'Invalid contractId',
            id,
            '.contractId',
            asset.contractId,
            getContractAddress(asset, sender),
        );
    }
    return undefined;
};

export const getContractAddress = (asset: HTLCLockAsset, sender: string): string => {
    return getAddressFromPublicKey(assetsToPublicKey(asset, sender));
};

export const assetsToPublicKey = (asset: HTLCLockAsset, sender: string): string => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(asset.data + asset.recipientPublicKey + sender + asset.time, 'utf8'))
        .digest();
    const pubKey = Buffer.concat([Buffer.alloc(4, "0199"), hash.slice(4, 32)]);
    return pubKey.toString("hex");
};

export const verifyKey = (hash: string, key: string, type: string = 'OP_HASH256'): boolean => {
    return hashKey(key, type) === hash;
};

export const hashKey = (key: string, type: string = 'OP_HASH256'): string => {
    const sha256Hash = crypto.createHash('sha256')
        .update(Buffer.from(key, 'utf8'))
        .digest("hex");
    return type === "OP_HASH160" ? new RIPEMD160().update(sha256Hash).digest("hex") : sha256Hash;
};

export const getTimeFromBlockchainEpoch = (givenTimestamp?: number): number => {
    const startingPoint = givenTimestamp || new Date().getTime();
    return Math.floor((startingPoint - EPOCH_TIME_MILLISECONDS) / MS_FACTOR);
};

export const getTimeWithOffset = (offset?: number): number => {
    const now = new Date().getTime();
    const timeWithOffset = offset ? now + offset * MS_FACTOR : now;
    return getTimeFromBlockchainEpoch(timeWithOffset);
};
