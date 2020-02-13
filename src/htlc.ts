import BigNum from '@liskhq/bignum';
import {
    bigNumberToBuffer,
    intToBuffer,
    getAddressFromPublicKey,
    stringToBuffer,
} from '@liskhq/lisk-cryptography';
import {
    isPositiveNumberString,
    isValidTransferAmount,
    validator,
} from '@liskhq/lisk-validator';

import {
    BaseTransaction,
    constants,
    convertToAssetError,
    StateStore,
    StateStorePrepare,
    TransactionError,
    utils,
} from '@liskhq/lisk-transactions';
import {
    Contract,
    HTLCRefundAsset,
    HTLCLockAsset,
    HTLCLockTransaction,
    HTLCRefundTransaction,
    HTLCUnlockAsset,
    HTLCUnlockTransaction,
} from './interfaces';
import {HTLCAssetRefundFormatSchema, HTLCAssetUnlockFormatSchema, HTLCAssetLockFormatSchema} from "./schemas";

import {HTLC_FEE, MIN_LOCK_TIME, subTypes} from "./constants";
import {
    assetsToPublicKey,
    getContractAddress,
    hashKey,
    verifyContractAddress,
    verifyKey,
} from "./utils";

const {verifyAmountBalance, verifyBalance} = utils;
const {BYTESIZES, MAX_TRANSACTION_AMOUNT} = constants;
const schemas = {
    [subTypes.LOCK]: HTLCAssetLockFormatSchema,
    [subTypes.UNLOCK]: HTLCAssetUnlockFormatSchema,
    [subTypes.REFUND]: HTLCAssetRefundFormatSchema,
};

export class HTLCTransaction extends BaseTransaction {
    public readonly asset: any;
    public static TYPE = 199;
    public static FEE = HTLC_FEE.toString();
    protected _subType: number;

    public constructor(rawTransaction: unknown, fee: string) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<HTLCLockTransaction | HTLCUnlockTransaction | HTLCRefundTransaction>;
        this._id = tx.id;
        this._subType = this.getTransactionSubType(tx);

        this.asset = {};
        if (this._subType === subTypes.LOCK) {
            const rawAsset = tx.asset as HTLCLockAsset;
            this.fee = new BigNum(fee);
            this.asset = {
                recipientPublicKey: rawAsset.recipientPublicKey ? rawAsset.recipientPublicKey : '',
                amount: BigInt(
                    isPositiveNumberString(rawAsset.amount) ? rawAsset.amount : '0',
                ),
                type: rawAsset.type,
                time: rawAsset.time ? rawAsset.time : 0,
                data: rawAsset.data ? rawAsset.data : '',
                secretLength: rawAsset.secretLength ? rawAsset.secretLength : 0,
                contractId: rawAsset.contractId ? rawAsset.contractId : getContractAddress(rawAsset, this.senderPublicKey),
            } as HTLCLockAsset;
        } else if (this._subType === subTypes.UNLOCK) {
            const rawAsset = tx.asset as HTLCUnlockAsset;
            this.fee = new BigNum(0);
            this.asset = {
                contractId: rawAsset.contractId,
                secret: rawAsset.secret,
            } as HTLCUnlockAsset;
        } else if (this._subType === subTypes.REFUND) {
            const rawAsset = tx.asset as HTLCRefundAsset;
            this.fee = new BigNum(0);
            this.asset = {
                contractId: rawAsset.contractId,
                data: rawAsset.data,
            } as HTLCRefundAsset;
        }
    }

    public getTransactionSubType(tx: any): number {
        if (tx.asset && tx.asset.contractId && tx.asset.data && !tx.asset.amount && !tx.asset.time && !tx.asset.type) {
            return subTypes.REFUND;
        } else if (tx.asset && tx.asset.contractId && tx.asset.secret) {
            return subTypes.UNLOCK;
        } else if (tx.asset && tx.asset.type && tx.asset.amount && tx.asset.time) {
            return subTypes.LOCK;
        }
        return subTypes.UNKNOWN;
    }

    protected assetToBytes(): Buffer {
        const transactionAmount = bigNumberToBuffer(
            this.asset.amount ? this.asset.amount.toString() : '0',
            BYTESIZES.AMOUNT,
            'big',
        );

        const contractId = this.asset.contractId
            ? intToBuffer(
                this.asset.contractId.slice(0, -1),
                8,
            ).slice(0, 8)
            : Buffer.alloc(0);

        const timeBuffer = this.asset.time ? intToBuffer(this.asset.time, 4) : Buffer.alloc(0);
        const dataBuffer = this.asset.data ? stringToBuffer(this.asset.data) : Buffer.alloc(0);
        const typeBuffer = this.asset.type ? stringToBuffer(this.asset.type) : Buffer.alloc(0);
        const secretLengthBuffer = this.asset.secretLength ? intToBuffer(this.asset.secretLength, 3) : Buffer.alloc(0);
        const secretBuffer = this.asset.secret ? stringToBuffer(this.asset.secret) : Buffer.alloc(0);
        const recipientBuffer = this.asset.recipientPublicKey ? stringToBuffer(this.asset.recipientPublicKey) : Buffer.alloc(0);

        return Buffer.concat([
            transactionAmount,
            contractId,
            recipientBuffer,
            typeBuffer,
            dataBuffer,
            secretLengthBuffer,
            secretBuffer,
            timeBuffer,
        ]);
    }

    public assetToJSON(): any {
        switch (this._subType) {
            case subTypes.LOCK:
                return {
                    contractId: this.asset.contractId,
                    amount: this.asset.amount.toString(),
                    recipientPublicKey: this.asset.recipientPublicKey,
                    type: this.asset.type,
                    time: this.asset.time,
                    data: this.asset.data,
                    secretLength: this.asset.secretLength,
                } as HTLCLockAsset;
            case subTypes.UNLOCK:
                return {
                    contractId: this.asset.contractId,
                    secret: this.asset.secret,
                } as HTLCUnlockAsset;
            case subTypes.REFUND:
                return {
                    contractId: this.asset.contractId,
                    data: this.asset.data,
                } as HTLCRefundAsset;
            default:
                return {};
        }
    }

    public async prepare(store: StateStorePrepare): Promise<void> {
        const cacheArray = [
            {
                address: this.senderId,
            }
        ];
        if (this.asset.contractId) {
            cacheArray.push({
                address: this.asset.contractId,
            });
        }
        if (this.asset.recipientPublicKey) {
            cacheArray.push({
                address: getAddressFromPublicKey(this.asset.recipientPublicKey),
            });
        }
        await store.account.cache(cacheArray);
    }

    protected validateAsset(): ReadonlyArray<TransactionError> {
        if (this._subType === subTypes.UNKNOWN) {
            return [
                new TransactionError(
                    'Couldn\'t match a sub type.',
                    this.id,
                    '.asset.??',
                ),
            ] as TransactionError[];
        }
        const asset = this.assetToJSON();
        const schemaErrors = validator.validate(schemas[this._subType], asset);
        const errors = convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];

        if (this._subType === subTypes.LOCK) {
            const contractAddressError = verifyContractAddress(
                this.id,
                this.asset,
                this.senderPublicKey,
            );
            if (contractAddressError) {
                errors.push(contractAddressError);
            }

            const secondsSinceEpoch = Math.round(new Date().getTime() / 1000);
            if (!this.blockId && this.asset.time && secondsSinceEpoch + MIN_LOCK_TIME > this.asset.time) {
                errors.push(
                    new TransactionError(
                        '`time` is already passed.',
                        this.id,
                        '.asset.time',
                        this.asset.time.toString(),
                        `> NOW + ${MIN_LOCK_TIME}`
                    ),
                );
            }

            if (this.asset.amount && !isValidTransferAmount(this.asset.amount.toString())) {
                errors.push(
                    new TransactionError(
                        'Amount must be a valid number in string format.',
                        this.id,
                        '.asset.amount',
                        this.asset.amount.toString(),
                    ),
                );
            }

            if (!this.asset.recipientPublicKey) {
                errors.push(
                    new TransactionError(
                        '`recipientPublicKey` must be provided.',
                        this.id,
                        '.asset.recipientPublicKey',
                    ),
                );
            }
        }

        return errors;
    }

    protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
        switch (this._subType) {
            case subTypes.UNLOCK:
                return this._applyRedeemAsset(store);
            case subTypes.REFUND:
                return this._applyRefundAsset(store);
            default:
                return this._applyLockAsset(store);
        }
    }

    protected _applyLockAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;
        const contractExist = (contract && !!contract.publicKey) || (contract && BigInt(contract.balance) > 0) || (contract && Object.entries(contract.asset).length > 0);
        const sender = store.account.get(this.senderId);

        if (contractExist) {
            errors.push(
                new TransactionError(
                    '`contractId` exists already.',
                    this.id,
                    '.contractId',
                    this.asset.contractId,
                ),
            );
        }

        const balanceError = verifyAmountBalance(
            this.id,
            sender,
            this.asset.amount,
            this.fee,
        );
        if (balanceError) {
            errors.push(balanceError);
        }

        const updatedSenderBalance = BigInt(sender.balance) - BigInt(this.asset.amount);
        const updatedSender = {
            ...sender,
            balance: updatedSenderBalance.toString(),
        };
        store.account.set(updatedSender.address, updatedSender);

        const updatedContract = {
            ...contract,
            balance: BigInt(this.asset.amount).toString(),
            publicKey: assetsToPublicKey(this.asset, this.senderPublicKey),
            asset: {
                type: this.asset.type,
                hash: this.asset.data,
                time: this.asset.time,
                length: this.asset.secretLength,
                amount: this.asset.amount.toString(),
                recipientPublicKey: this.asset.recipientPublicKey,
                senderPublicKey: this.senderPublicKey,
            },
        };
        store.account.set(updatedContract.address, updatedContract);

        return errors;
    }

    protected _applyRedeemAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;
        const contractExist = (contract && !!contract.publicKey) || (contract && BigInt(contract.balance) > 0) || (contract && Object.entries(contract.asset).length > 0);
        const secondsSinceEpoch = Math.round(new Date().getTime() / 1000);

        if (!contractExist) {
            errors.push(
                new TransactionError(
                    'Contract doesn\'t exist.',
                    this.id,
                    this.asset.contractId,
                ),
            );
        } else {
            const {senderPublicKey, recipientPublicKey, time, type, hash, key, timedOut} = contract.asset;
            if (senderPublicKey !== this.senderPublicKey && recipientPublicKey !== this.senderPublicKey) {
                errors.push(
                    new TransactionError(
                        '`senderPublicKey` is not a participant in this contract.',
                        this.id,
                        '.senderPublicKey',
                        this.senderPublicKey,
                    )
                );
            }

            if (key || timedOut) {
                errors.push(
                    new TransactionError(
                        'Contract already resolved.',
                        this.id,
                        key ? '.asset.key' : '.asset.timedOut',
                        key ? `${key}` : `${timedOut}`,
                    ),
                );
            }

            const sender = store.account.getOrDefault(this.senderId);
            if (!this.blockId && secondsSinceEpoch > time) {
                errors.push(
                    new TransactionError(
                        'Contract is timed out.',
                        this.id,
                        '.asset.time',
                        time,
                        `< ${secondsSinceEpoch}`,
                    ),
                );
            }
            if (!verifyKey(hash, this.asset.secret, type)) {
                errors.push(
                    new TransactionError(
                        'Wrong secret.',
                        this.id,
                        '.asset.secret',
                        type === "OP_HASH256" ?
                            `SHA256(${this.asset.secret}) == ${hashKey(this.asset.secret, type)}` :
                            `RIPEMD160(SHA256(${this.asset.secret})) == ${hashKey(this.asset.secret, type)}`,
                        type === "OP_HASH256" ?
                            `sha256(${this.asset.secret}) == ${hash}` :
                            `RIPEMD160(sha256(${this.asset.secret})) == ${hash}`,
                    ),
                );
            }

            const balanceError = verifyAmountBalance(
                this.id,
                contract,
                new BigNum(contract.asset.amount),
                this.fee,
            );
            if (balanceError) {
                errors.push(balanceError);
            }
            const updatedContract = {
                ...contract,
                balance: '0',
                asset: {
                    ...contract.asset,
                    key: this.asset.secret,
                },
            };
            store.account.set(updatedContract.address, updatedContract);

            const updatedRecipientBalance = BigInt(sender.balance) + BigInt(contract.balance);
            if (updatedRecipientBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
                errors.push(
                    new TransactionError(
                        'Max transaction amount reached',
                        this.id,
                        '.amount',
                        updatedRecipientBalance.toString(),
                    ),
                );
            }
            const updatedRecipient = {
                ...sender,
                balance: updatedRecipientBalance.toString(),
            };
            store.account.set(updatedRecipient.address, updatedRecipient);
        }

        return errors;
    }

    protected _applyRefundAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;
        const contractExist = (contract && !!contract.publicKey) || (contract && BigInt(contract.balance) > 0) || (contract && Object.entries(contract.asset).length > 0);
        const secondsSinceEpoch = Math.round(new Date().getTime() / 1000);

        if (!contractExist) {
            errors.push(
                new TransactionError(
                    'Contract doesn\'t exist.',
                    this.id,
                    this.asset.contractId,
                ),
            );
        } else {
            const {senderPublicKey, recipientPublicKey, time, hash, key, timedOut} = contract.asset;
            if (senderPublicKey !== this.senderPublicKey && recipientPublicKey !== this.senderPublicKey) {
                errors.push(
                    new TransactionError(
                        '`senderPublicKey` is not a participant in this contract.',
                        this.id,
                        '.senderPublicKey',
                        this.senderPublicKey,
                    )
                );
            }

            if (key || timedOut) {
                errors.push(
                    new TransactionError(
                        'Contract already resolved.',
                        this.id,
                        key ? '.asset.key' : '.asset.timedOut',
                        key ? `${key}` : `${timedOut}`,
                    ),
                );
            }

            const sender = store.account.get(this.senderId);
            if (secondsSinceEpoch < time) {
                errors.push(
                    new TransactionError(
                        'Contract is not yet timed out.',
                        this.id,
                        '.asset.time',
                        time,
                        `>${secondsSinceEpoch}`,
                    ),
                );
            }
            if (hash !== this.asset.data) {
                errors.push(
                    new TransactionError(
                        '`data` is not correct.',
                        this.id,
                        '.asset.data',
                        this.asset.data,
                        hash,
                    ),
                );
            }

            const balanceError = verifyAmountBalance(
                this.id,
                contract,
                new BigNum(contract.asset.amount),
                this.fee,
            );
            if (balanceError) {
                errors.push(balanceError);
            }

            const updatedContract = {
                ...contract,
                balance: '0',
                asset: {
                    ...contract.asset,
                    timedOut: true,
                },
            };
            store.account.set(updatedContract.address, updatedContract);

            const updatedSenderBalance = BigInt(sender.balance) + BigInt(contract.asset.amount);
            if (updatedSenderBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
                errors.push(
                    new TransactionError(
                        'Max transaction amount reached',
                        this.id,
                        '.amount',
                        updatedSenderBalance.toString(),
                    ),
                );
            }
            const updatedSender = {
                ...sender,
                balance: updatedSenderBalance.toString(),
            };
            store.account.set(updatedSender.address, updatedSender);
        }

        return errors;
    }

    protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
        switch (this._subType) {
            case subTypes.UNLOCK:
                return this._undoRedeemAsset(store);
            case subTypes.REFUND:
                return this._undoRefundAsset(store);
            default:
                return this._undoLockAsset(store);
        }
    }

    protected _undoLockAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const sender = store.account.get(this.senderId);
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;

        const balanceError = verifyBalance(
            this.id,
            contract,
            this.asset.amount,
        );
        if (balanceError) {
            errors.push(balanceError);
        }
        const updatedSenderBalance = BigInt(sender.balance) + BigInt(this.asset.amount);
        if (updatedSenderBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
            errors.push(
                new TransactionError(
                    'Invalid amount',
                    this.id,
                    '.amount',
                    updatedSenderBalance.toString(),
                ),
            );
        }
        const updatedSender = {
            ...sender,
            balance: updatedSenderBalance.toString(),
        };
        store.account.set(updatedSender.address, updatedSender);

        const updatedContract = {
            address: contract.address,
            publicKey: '',
            balance: '0',
            asset: {},
        };
        store.account.set(updatedContract.address, updatedContract);

        return errors;
    }

    protected _undoRedeemAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const sender = store.account.get(this.senderId);
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;
        const {key} = contract.asset;

        if (key) {
            const balanceError = verifyBalance(
                this.id,
                sender,
                new BigNum(contract.asset.amount),
            );
            if (balanceError) {
                errors.push(balanceError);
            }

            const updatedContractBalance = BigInt(contract.balance) + BigInt(contract.asset.amount);
            if (updatedContractBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
                errors.push(
                    new TransactionError(
                        'Invalid amount',
                        this.id,
                        '.asset.amount',
                        updatedContractBalance.toString(),
                    ),
                );
            }
            const updatedContract = {
                ...contract,
                balance: updatedContractBalance.toString(),
                asset: {
                    ...contract.asset,
                    key: null,
                },
            };
            store.account.set(updatedContract.address, updatedContract);

            const updatedRecipient = {
                ...sender,
                balance: (BigInt(sender.balance) - BigInt(contract.balance)).toString(),
            };
            store.account.set(sender.address, updatedRecipient);
        }

        return errors;
    }

    protected _undoRefundAsset(store: StateStore): ReadonlyArray<TransactionError> {
        const errors: TransactionError[] = [];
        const sender = store.account.get(this.senderId);
        const contract = store.account.getOrDefault(this.asset.contractId) as Contract;
        const {timedOut} = contract.asset;

        if (timedOut) {
            const balanceError = verifyBalance(
                this.id,
                sender,
                new BigNum(contract.asset.amount),
            );
            if (balanceError) {
                errors.push(balanceError);
            }

            const updatedContractBalance = BigInt(contract.balance) + BigInt(contract.asset.amount);
            if (updatedContractBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
                errors.push(
                    new TransactionError(
                        'Invalid amount',
                        this.id,
                        '.amount',
                        updatedContractBalance.toString(),
                    ),
                );
            }
            const updatedContract = {
                ...contract,
                balance: updatedContractBalance.toString(),
                asset: {
                    ...contract.asset,
                    timedOut: false,
                },
            };
            store.account.set(updatedContract.address, updatedContract);

            const updatedSender = {
                ...sender,
                balance: (BigInt(sender.balance) - BigInt(contract.balance)).toString(),
            };
            store.account.set(updatedSender.address, updatedSender);
        }

        return errors;
    }

}
