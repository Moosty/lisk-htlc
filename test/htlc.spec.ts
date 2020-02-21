import {Status, TransactionError, constants} from '@liskhq/lisk-transactions';
import {HTLCTransaction} from '../src';
import {MockStateStore as store} from './helpers/state_store';
import {validTransactions, validAccounts, validContracts} from '../fixtures';
import {
    HTLCLockAsset,
    HTLCLockTransaction,
    HTLCRefundTransaction,
    HTLCUnlockTransaction,
    HTLCUnlockAsset
} from "../src/interfaces";

const {MAX_TRANSACTION_AMOUNT} = constants;
jest.spyOn(global.console, "log").mockImplementation(() => jest.fn());

describe('HTLC transaction class', () => {
    const validHTLCLockTransactionInput = validTransactions[0].input;
    const validHTLCLockTransactionOutput = validTransactions[0].output as any;
    const validHTLCRedeemTransactionInput = validTransactions[2].input;
    const validHTLCRedeemTransactionOutput = validTransactions[2].output as HTLCUnlockTransaction;
    const validHTLCRefundTransactionInput = validTransactions[1].input;
    const validHTLCRefundTransactionOutput = validTransactions[1].output as HTLCRefundTransaction;
    const emptyContract = validContracts[0] as any;
    const validHTLCContract = validContracts[1] as any;
    const validHTLCRedeemedContract = validContracts[2] as any;
    const validHTLCSender = validAccounts[0];
    const validHTLCRecipient = validAccounts[1];
    let validHTLCTestLockTransaction: HTLCLockTransaction;
    let validHTLCTestUnLockTransaction: HTLCUnlockTransaction;
    let validHTLCTestRefundTransaction: HTLCRefundTransaction;
    let sender;
    let recipient;
    let validContract;
    let expiredContract;
    let storeAccountCacheStub: jest.SpyInstance;
    let storeAccountGetStub: jest.SpyInstance;
    let storeAccountGetOrDefaultStub: jest.SpyInstance;
    let storeAccountSetStub: jest.SpyInstance;


    describe('Create HTLC Contract', () => {
        beforeEach(async () => {
            validHTLCTestLockTransaction = new HTLCTransaction(
                validHTLCLockTransactionInput,
            ) as HTLCLockTransaction;
            sender = {...validHTLCSender, balance: '10000000000'};

            storeAccountCacheStub = jest.spyOn(store.account, 'cache');
            storeAccountGetStub = jest
                .spyOn(store.account, 'get')
                .mockReturnValue(sender);
            storeAccountGetOrDefaultStub = jest
                .spyOn(store.account, 'getOrDefault')
                .mockReturnValue(emptyContract);
            storeAccountSetStub = jest.spyOn(store.account, 'set');
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('#constructor', () => {
            it('should create instance of HTLCTransaction', async () => {
                expect(validHTLCTestLockTransaction).toBeInstanceOf(HTLCTransaction);
            });

            it('should set htlc asset contractId', async () => {
                expect(validHTLCTestLockTransaction.asset.contractId).toEqual(
                    validHTLCLockTransactionOutput.asset.contractId,
                );
            });

            it('should set htlc asset recipientPublicKey', async () => {
                expect(validHTLCTestLockTransaction.asset.recipientPublicKey).toEqual(
                    validHTLCLockTransactionOutput.asset.recipientPublicKey,
                );
            });

            it('should set htlc asset amount', async () => {
                expect(validHTLCTestLockTransaction.asset.amount.toString()).toEqual(
                    validHTLCLockTransactionOutput.asset.amount,
                );
            });

            it('should set htlc asset type', async () => {
                expect(validHTLCTestLockTransaction.asset.type).toEqual(
                    validHTLCLockTransactionOutput.asset.type,
                );
            });

            it('should set htlc asset time', async () => {
                expect(validHTLCTestLockTransaction.asset.time).toEqual(
                    validHTLCLockTransactionOutput.asset.time,
                );
            });

            it('should set htlc asset data', async () => {
                expect(validHTLCTestLockTransaction.asset.data).toEqual(
                    validHTLCLockTransactionOutput.asset.data,
                );
            });

            it('should set htlc asset secretLength', async () => {
                expect(validHTLCTestLockTransaction.asset.secretLength).toEqual(
                    validHTLCLockTransactionOutput.asset.secretLength,
                );
            });
        });

        describe('#getBasicBytes', () => {
            // @ts-ignore
            const expectedBytes = validHTLCLockTransactionOutput.bytes;
            it('should return a buffer', async () => {
                const basicBytes = (validHTLCTestLockTransaction as any).getBasicBytes();
                expect(basicBytes).toEqual(Buffer.from(expectedBytes, 'hex'));
            });
        });

        describe('#verifyAgainstOtherTransactions', () => {
            it('should return a successful transaction response', async () => {
                // @ts-ignore
                validHTLCTestLockTransaction.sign(validHTLCLockTransactionInput.passphrase);
                const {
                    id,
                    status,
                    errors,
                    // @ts-ignore
                } = validHTLCTestLockTransaction.verifyAgainstOtherTransactions([]);
                expect(id).toEqual(validHTLCLockTransactionOutput.id);
                expect(Object.keys(errors)).toHaveLength(0);
                expect(status).toEqual(Status.OK);
            });
        });

        describe('#assetToJSON', () => {
            it('should return an object of type htlc asset', async () => {
                // @ts-ignore
                expect(validHTLCTestLockTransaction.assetToJSON() as any).toEqual(validHTLCLockTransactionOutput.asset as HTLCLockAsset);
            });

            it('should return an empty object', async () => {
                const htlcTransactionWithInvalidSubtype = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            type: null
                        },
                    },
                );
                expect(htlcTransactionWithInvalidSubtype.assetToJSON() as any).toEqual({});
            });
        });

        describe('#prepare', () => {
            it('should call state store', async () => {
                // @ts-ignore
                await validHTLCTestLockTransaction.prepare(store);
                expect(storeAccountCacheStub).toHaveBeenCalledWith([
                    {address: validHTLCTestLockTransaction.senderId},
                    {address: validHTLCTestLockTransaction.asset.contractId},
                    {address: validHTLCRecipient.address},
                ]);
            });
        });

        describe('#validateAsset', () => {
            it('should return no errors with a valid htlc transaction', async () => {
                const errors = (validHTLCTestLockTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should return no subtype found from invalid transaction', async () => {
                const htlcTransactionWithInvalidTransaction = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            contractId: validHTLCLockTransactionInput.asset.contractId,
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Couldn\'t match a sub type.',
                );
            });

            it('should return error for missing recipientPublicKey', async () => {
                const htlcTransactionWithInvalidTransaction = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            recipientPublicKey: null,
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(2);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Invalid contractId',
                );
                expect(errors[1]).toBeInstanceOf(TransactionError);
                expect(errors[1].message).toContain(
                    '`recipientPublicKey` must be provided.',
                );
            });

            it('should return error for missing time', async () => {
                const htlcTransactionWithInvalidTransaction = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            time: null,
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Couldn\'t match a sub type.',
                );
            });

            it('should return error expired time', async () => {
                const htlcTransactionWithInvalidTransaction = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            time: 123123132,
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(2);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Invalid contractId',
                );
                expect(errors[1]).toBeInstanceOf(TransactionError);
                expect(errors[1].message).toContain(
                    '`time` is already passed.',
                );
            });

            it('should return error with invalid contractId', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            contractId: '123456',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    '\'.contractId\' should match format "address"',
                );
            });

            it('should return error if contractId exceed uint64 limit', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            contractId: '19961131544040416558L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(2);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[1]).toBeInstanceOf(TransactionError);
            });

            it('should return error if contractId contains leading zeros', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCLockTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCLockTransactionInput.asset,
                            contractId: '000123L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(2);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[1]).toBeInstanceOf(TransactionError);
            });

            it('should return error with invalid amount', async () => {
                const htlcTransactionWithInvalidAmount = new HTLCTransaction({
                    ...validHTLCLockTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCLockTransactionInput.asset,
                        amount: '9223372036854775808',
                    },
                });
                const errors = (htlcTransactionWithInvalidAmount as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toEqual(
                    'Amount must be a valid number in string format.',
                );
                expect(errors[0].dataPath).toEqual('.asset.amount');
            });


            it('should return error with invalid asset', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCLockTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCLockTransactionInput.asset,
                        data:
                            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error if asset data containing null string', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCLockTransactionOutput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCLockTransactionOutput.asset,
                        data: '\u0000hey:)',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors).toHaveLength(2);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[1]).toBeInstanceOf(TransactionError);
            });

            it('should return error with asset data containing overflowed string', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCLockTransactionOutput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCLockTransactionOutput.asset,
                        data:
                            'o2ljg313lzzopdcilxcuy840qzdnmj21hfehd8u63k9jkifpsgxptegi56t8xos现',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });
        });

        describe('#applyAsset', () => {

            it('should return no errors', async () => {
                const errors = (validHTLCTestLockTransaction as any).applyAsset(store);
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should call state store', async () => {

                (validHTLCTestLockTransaction as any).applyAsset(store);
                expect(storeAccountGetStub).toHaveBeenCalledWith(
                    validHTLCLockTransactionOutput.senderId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCLockTransactionOutput.senderId, {
                    ...sender,
                    balance: (
                        BigInt(sender.balance) -
                        BigInt(validHTLCLockTransactionOutput.asset.amount)
                    ).toString(),
                });
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCTestLockTransaction.asset.contractId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCLockTransactionOutput.asset.contractId, validHTLCContract);
            });

            it('should return error when sender balance is insufficient', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...sender,
                    balance: BigInt(10000000),
                });
                const errors = await (validHTLCTestLockTransaction as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${sender.address}, balance: 0.3`,
                );
            });

            it('should return error when contractId already exist', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...emptyContract,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                const errors = await (validHTLCTestLockTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('`contractId` exists already.');
            });

        });

        describe('#undoAsset', () => {
            it('should call state store', async () => {
                (validHTLCTestLockTransaction as any).undoAsset(store);
                expect(storeAccountGetStub).toHaveBeenCalledWith(
                    validHTLCTestLockTransaction.senderId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCLockTransactionOutput.senderId, {
                    ...sender,
                    balance: (
                        BigInt(sender.balance) +
                        BigInt(validHTLCTestLockTransaction.asset.amount)
                    ).toString(),
                });
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCLockTransactionOutput.asset.contractId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCContract.address, {
                    address: emptyContract.address,
                    asset: {},
                    balance: "0",
                    publicKey: "",
                });
            });

            it('should return error when recipient balance is insufficient', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    balance: BigInt('0'),
                });
                const errors = await (validHTLCTestLockTransaction as any).undoAsset(
                    store,
                );
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${validHTLCContract.address}, balance: 0`,
                );
            });

            it('should return error when sender balance is over maximum amount', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...sender,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                });
                const errors = await (validHTLCTestLockTransaction as any).undoAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Invalid amount');
            });
        });

    });
    describe('Redeem HTLC contract', () => {

        beforeEach(async () => {
            validHTLCTestUnLockTransaction = new HTLCTransaction(
                validHTLCRedeemTransactionInput,
            ) as HTLCUnlockTransaction;
            validContract = {...validHTLCContract};
            recipient = {...validHTLCRecipient, balance: '10000000000'};

            storeAccountCacheStub = jest.spyOn(store.account, 'cache');
            storeAccountGetStub = jest
                .spyOn(store.account, 'get')
                .mockReturnValue(recipient);
            storeAccountGetOrDefaultStub = jest
                .spyOn(store.account, 'getOrDefault')
                .mockReturnValue(validContract);

            storeAccountSetStub = jest.spyOn(store.account, 'set');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('#constructor', () => {
            it('should create instance of HTLCTransaction', async () => {
                expect(validHTLCTestUnLockTransaction).toBeInstanceOf(HTLCTransaction);
            });

            it('should set htlc asset contractId', async () => {
                expect(validHTLCTestLockTransaction.asset.contractId).toEqual(
                    validHTLCRedeemTransactionOutput.asset.contractId,
                );
            });

            it('should set htlc asset secret', async () => {
                expect(validHTLCTestUnLockTransaction.asset.secret).toEqual(
                    validHTLCRedeemTransactionOutput.asset.secret,
                );
            });
        });

        describe('#getBasicBytes', () => {
            // @ts-ignore
            const expectedBytes = validHTLCRedeemTransactionOutput.bytes;
            it('should return a buffer', async () => {
                // @ts-ignore
                validHTLCTestUnLockTransaction.sign(validHTLCRedeemTransactionInput.passphrase);
                const basicBytes = (validHTLCTestUnLockTransaction as any).getBasicBytes();
                expect(basicBytes).toEqual(Buffer.from(expectedBytes, 'hex'));
            });
        });

        describe('#verifyAgainstOtherTransactions', () => {
            it('should return a successful transaction response', async () => {
                // @ts-ignore
                validHTLCTestUnLockTransaction.sign(validHTLCRedeemTransactionInput.passphrase);
                const {
                    id,
                    status,
                    errors,
                    // @ts-ignore
                } = validHTLCTestUnLockTransaction.verifyAgainstOtherTransactions([]);
                expect(id).toEqual(validHTLCRedeemTransactionOutput.id);
                expect(Object.keys(errors)).toHaveLength(0);
                expect(status).toEqual(Status.OK);
            });
        });

        describe('#assetToJSON', () => {
            it('should return an object of type htlc asset', async () => {
                // @ts-ignore
                expect(validHTLCTestUnLockTransaction.assetToJSON() as any).toEqual(validHTLCRedeemTransactionOutput.asset as HTLCUnlockAsset);
            });
        });

        describe('#prepare', () => {
            it('should call state store', async () => {
                // @ts-ignore
                validHTLCTestUnLockTransaction.sign(validHTLCRedeemTransactionInput.passphrase);
                // @ts-ignore
                await validHTLCTestUnLockTransaction.prepare(store);
                expect(storeAccountCacheStub).toHaveBeenCalledWith([
                    {address: validHTLCRedeemTransactionOutput.senderId},
                    {address: validHTLCRedeemTransactionOutput.asset.contractId},
                ]);
            });
        });

        describe('#validateAsset', () => {
            it('should return no errors with a valid htlc transaction', async () => {
                const errors = (validHTLCTestUnLockTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should return error with invalid contractId', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRedeemTransactionInput.asset,
                            contractId: '123456',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    '\'.contractId\' should match format "address"',
                );
            });

            it('should return error if contractId exceed uint64 limit', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRedeemTransactionInput.asset,
                            contractId: '19961131544040416558L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error if contractId contains leading zeros', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRedeemTransactionInput.asset,
                            contractId: '000123L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error with missing secret', async () => {
                const htlcTransactionWithInvalidSecret = new HTLCTransaction({
                    ...validHTLCRedeemTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRedeemTransactionInput.asset,
                        secret: null,
                    },
                });
                const errors = (htlcTransactionWithInvalidSecret as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toEqual(
                    'Couldn\'t match a sub type.',
                );
            });

            it('should return error with invalid secret', async () => {
                const htlcTransactionWithInvalidSecret = new HTLCTransaction({
                    ...validHTLCRedeemTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRedeemTransactionInput.asset,
                        secret: 123123,
                    },
                });
                const errors = (htlcTransactionWithInvalidSecret as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toEqual(
                    '\'.secret\' should be string',
                );
                expect(errors[0].dataPath).toEqual('.secret');
            });

            it('should return error with invalid secret', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCRedeemTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRedeemTransactionInput.asset,
                        secret:
                            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error with asset secret containing overflowed string', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCRedeemTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRedeemTransactionInput.asset,
                        secret: 'o2ljg313lzzopdcilxcuy840qzdnmj21hfehd8u63k9jkifpsgxptegi56t8xos现',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });
        });

        describe('#applyAsset', () => {

            it('should return no errors', async () => {
                const errors = (validHTLCTestUnLockTransaction as any).applyAsset(store);
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should return error contractId not found', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue(null);
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRedeemTransactionInput.asset,
                            contractId: '1123456L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).applyAsset(store);
                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Contract doesn\'t exist.',
                );
            });

            it('should call state store', async () => {
                (validHTLCTestUnLockTransaction as any).applyAsset(store);
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCRedeemTransactionOutput.senderId,
                );
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCRedeemTransactionOutput.asset.contractId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCRedeemTransactionOutput.asset.contractId, validHTLCRedeemedContract);
            });

            it('should return error when senderPublicKey is not participant in contract', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                        senderPublicKey: "aadd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a"
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `\`senderPublicKey\` is not a participant in this contract.`,
                );
            });

            it('should return error when contract balance is insufficient', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    balance: BigInt(30000000),
                });
                const errors = await (validHTLCTestUnLockTransaction as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${validHTLCContract.address}, balance: 0.3`,
                );
            });

            it('should return error when contractId not exist', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...emptyContract,
                    address: '1234L',
                });
                const errors = await (validHTLCTestUnLockTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Contract doesn\'t exist.');
            });

            it('should return error when secret is wrong', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                });
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCRedeemTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRedeemTransactionInput.asset,
                        secret: 'wrongSecret',
                    },
                });
                const errors = await (htlcTransactionWithInvalidAsset as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Wrong secret.');
            });

            it('should return error when sender balance is over maximum amount', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...recipient,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                const errors = await (validHTLCTestUnLockTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Max transaction amount reached');
            });

            it('should return error when contract is already redeemed', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    asset: {
                        ...validHTLCContract.asset,
                        key: 'secretKey',
                        time: 1230
                    }
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Contract already resolved.`,
                );
            });
        });

        describe('#undoAsset', () => {
            it('should call state store', async () => {
                storeAccountGetOrDefaultStub = jest
                    .spyOn(store.account, 'getOrDefault')
                    .mockReturnValue(validHTLCRedeemedContract);
                (validHTLCTestUnLockTransaction as any).undoAsset(store);
                expect(storeAccountGetStub).toHaveBeenCalledWith(
                    validHTLCRedeemTransactionOutput.senderId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCRedeemTransactionOutput.senderId, {
                    ...recipient,
                    balance: (
                        BigInt(recipient.balance)
                    ).toString(),
                });
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCLockTransactionOutput.asset.contractId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCContract.address, {
                    ...validHTLCContract,
                    asset: {
                        ...validHTLCContract.asset,
                        key: null
                    }
                });
            });

            it('should return error when recipient balance is insufficient', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCRedeemedContract,
                });
                storeAccountGetStub.mockReturnValue({
                    ...recipient,
                    balance: '0',
                });
                const errors = await (validHTLCTestUnLockTransaction as any).undoAsset(store);
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${recipient.address}, balance: 0`,
                );
            });

            it('should return error when sender balance is over maximum amount', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...recipient,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCRedeemedContract,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                const errors = await (validHTLCTestUnLockTransaction as any).undoAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Invalid amount');
            });

            it('should return error when contract is already redeemed', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    asset: {
                        ...validHTLCContract.asset,
                        key: 'secretKey',
                    }
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Contract already resolved.`,
                );
            });

            it('should return error when contract is expired', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    asset: {
                        ...validHTLCContract.asset,
                        time: 1202,
                    }
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Contract is timed out.`,
                );
            });

            it('should return error when contract is resolved', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                    asset: {
                        ...validHTLCContract.asset,
                        timedOut: true,
                    }
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRedeemTransactionInput,
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Contract already resolved.`,
                );
            });
        });
    });


    describe('Refund HTLC contract', () => {

        beforeEach(async () => {
            validHTLCTestRefundTransaction = new HTLCTransaction(
                validHTLCRefundTransactionInput,
            ) as HTLCRefundTransaction;
            expiredContract = {...validHTLCContract, asset: {...validHTLCContract.asset, time: 1000}};
            sender = {...validHTLCSender, balance: '10000000000'};

            storeAccountCacheStub = jest.spyOn(store.account, 'cache');
            storeAccountGetStub = jest
                .spyOn(store.account, 'get')
                .mockReturnValue(sender);
            storeAccountGetOrDefaultStub = jest
                .spyOn(store.account, 'getOrDefault')
                .mockReturnValue(expiredContract);

            storeAccountSetStub = jest.spyOn(store.account, 'set');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('#constructor', () => {
            it('should create instance of HTLCTransaction', async () => {
                expect(validHTLCTestRefundTransaction).toBeInstanceOf(HTLCTransaction);
            });

            it('should set htlc asset contractId', async () => {
                expect(validHTLCTestRefundTransaction.asset.contractId).toEqual(
                    validHTLCRefundTransactionOutput.asset.contractId,
                );
            });

            it('should set htlc asset data', async () => {
                expect(validHTLCTestRefundTransaction.asset.data).toEqual(
                    validHTLCRefundTransactionOutput.asset.data,
                );
            });
        });

        describe('#getBasicBytes', () => {
            // @ts-ignore
            const expectedBytes = validHTLCRefundTransactionOutput.bytes;
            it('should return a buffer', async () => {
                const basicBytes = (validHTLCTestRefundTransaction as any).getBasicBytes();
                expect(basicBytes).toEqual(Buffer.from(expectedBytes, 'hex'));
            });
        });

        describe('#verifyAgainstOtherTransactions', () => {
            it('should return a successful transaction response', async () => {
                // @ts-ignore
                validHTLCTestRefundTransaction.sign(validHTLCRefundTransactionInput.passphrase);
                const {
                    id,
                    status,
                    errors,
                    // @ts-ignore
                } = validHTLCTestRefundTransaction.verifyAgainstOtherTransactions([]);
                expect(id).toEqual(validHTLCRefundTransactionOutput.id);
                expect(Object.keys(errors)).toHaveLength(0);
                expect(status).toEqual(Status.OK);
            });
        });

        describe('#assetToJSON', () => {
            it('should return an object of type htlc asset', async () => {
                // @ts-ignore
                expect(validHTLCTestRefundTransaction.assetToJSON() as any).toEqual(validHTLCRefundTransactionOutput.asset as HTLCUnlockAsset);
            });
        });

        describe('#prepare', () => {
            it('should call state store', async () => {
                // @ts-ignore
                validHTLCTestRefundTransaction.sign(validHTLCRefundTransactionInput.passphrase);
                // @ts-ignore
                await validHTLCTestRefundTransaction.prepare(store);
                expect(storeAccountCacheStub).toHaveBeenCalledWith([
                    {address: validHTLCRefundTransactionOutput.senderId},
                    {address: validHTLCRefundTransactionOutput.asset.contractId},
                ]);
            });
        });

        describe('#validateAsset', () => {
            it('should return no errors with a valid htlc transaction', async () => {
                const errors = (validHTLCTestRefundTransaction as any).validateAsset();
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should return error with missing data asset', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRefundTransactionInput.asset,
                            data: null,
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    'Couldn\'t match a sub type.',
                );
            });

            it('should return error with invalid contractId', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRefundTransactionInput.asset,
                            contractId: '123456',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toContain(
                    '\'.contractId\' should match format "address"',
                );
            });

            it('should return error if contractId exceed uint64 limit', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRefundTransactionInput.asset,
                            contractId: '19961131544040416558L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error if contractId contains leading zeros', async () => {
                const htlcTransactionWithInvalidContractId = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                        asset: {
                            // @ts-ignore
                            ...validHTLCRefundTransactionInput.asset,
                            contractId: '000123L',
                        },
                    },
                );
                const errors = (htlcTransactionWithInvalidContractId as any).validateAsset();

                expect(errors).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error with invalid data', async () => {
                const htlcTransactionWithInvalidSecret = new HTLCTransaction({
                    ...validHTLCRefundTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRefundTransactionInput.asset,
                        data: 123123,
                    },
                });
                const errors = (htlcTransactionWithInvalidSecret as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
                expect(errors[0].message).toEqual(
                    '\'.data\' should be string',
                );
                expect(errors[0].dataPath).toEqual('.data');
            });

            it('should return error with invalid data', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCRefundTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRefundTransactionInput.asset,
                        data:
                            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });

            it('should return error with asset data containing overflowed string', async () => {
                const htlcTransactionWithInvalidAsset = new HTLCTransaction({
                    ...validHTLCRefundTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRefundTransactionInput.asset,
                        data: 'o2ljg313lzzopdcilxcuy840qzdnmj21hfehd8u63k9jkifpsgxptegi56t8xos现',
                    },
                });
                const errors = (htlcTransactionWithInvalidAsset as any).validateAsset();

                expect(errors[0]).toBeInstanceOf(TransactionError);
            });
        });

        describe('#applyAsset', () => {

            it('should return no errors', async () => {
                const errors = (validHTLCTestRefundTransaction as any).applyAsset(store);
                expect(Object.keys(errors)).toHaveLength(0);
            });

            it('should call state store', async () => {
                (validHTLCTestUnLockTransaction as any).applyAsset(store);
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    recipient.address,
                );
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCRedeemTransactionOutput.asset.contractId,
                );
            });

            it('should return error when senderPublicKey is not participant in contract', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                });
                const htlcTransactionWithInvalidSenderPublicKey = new HTLCTransaction(
                    {
                        ...validHTLCRefundTransactionInput,
                        senderPublicKey: "aadd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a"
                    },
                );
                const errors = await (htlcTransactionWithInvalidSenderPublicKey as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `\`senderPublicKey\` is not a participant in this contract.`,
                );
            });

            it('should return error when contract balance is insufficient', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                    balance: BigInt(30000000),
                });
                const errors = await (validHTLCTestRefundTransaction as any).applyAsset(
                    store,
                );
                expect(errors).toHaveLength(1);
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${validHTLCContract.address}, balance: 0.3`,
                );
            });

            it('should return error when contractId not exist', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...emptyContract,
                    address: '1234L',
                });
                const errors = await (validHTLCTestRefundTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Contract doesn\'t exist.');
            });

            it('should return error when contractId is not yet expired', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...validHTLCContract,
                });
                const errors = await (validHTLCTestRefundTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Contract is not yet timed out.');
            });

            it('should return error when data asset is wrong', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                });
                const htlcTransactionWithInvalidData = new HTLCTransaction({
                    ...validHTLCRefundTransactionInput,
                    asset: {
                        // @ts-ignore
                        ...validHTLCRefundTransactionInput.asset,
                        data: "123123",
                    },
                });
                const errors = await (htlcTransactionWithInvalidData as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('`data` is not correct.');
            });

            it('should return error when sender balance is over maximum amount', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...sender,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                const errors = await (validHTLCTestRefundTransaction as any).applyAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Max transaction amount reached');
            });
        });

        describe('#undoAsset', () => {
            it('should call state store', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                    asset: {
                        ...expiredContract.asset,
                        timedOut: true,
                    },
                    balance: '0',
                });
                (validHTLCTestRefundTransaction as any).undoAsset(store);
                expect(storeAccountGetStub).toHaveBeenCalledWith(
                    validHTLCRefundTransactionOutput.senderId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(validHTLCRefundTransactionOutput.senderId, {
                    ...sender,
                    balance: (
                        BigInt(sender.balance)
                    ).toString(),
                });
                expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
                    validHTLCRefundTransactionOutput.asset.contractId,
                );
                expect(storeAccountSetStub).toHaveBeenCalledWith(expiredContract.address, {
                    ...expiredContract,
                    asset: {
                        ...expiredContract.asset,
                        timedOut: false,
                    }
                });
            });

            it('should return error when sender balance is insufficient', async () => {
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                    asset: {
                        ...expiredContract.asset,
                        timedOut: true,
                        balance: '0',
                    }
                });
                storeAccountGetStub.mockReturnValue({
                    ...sender,
                    balance: '0',
                });
                const errors = await (validHTLCTestRefundTransaction as any).undoAsset(store);
                expect(errors[0].message).toBe(
                    `Account does not have enough LSK: ${sender.address}, balance: 0`,
                );
            });

            it('should return error when contract balance is over maximum amount', async () => {
                storeAccountGetStub.mockReturnValue({
                    ...sender,
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                storeAccountGetOrDefaultStub.mockReturnValue({
                    ...expiredContract,
                    asset: {
                        ...expiredContract.asset,
                        timedOut: true,
                    },
                    balance: BigInt(MAX_TRANSACTION_AMOUNT),
                });
                const errors = await (validHTLCTestRefundTransaction as any).undoAsset(
                    store,
                );
                expect(errors[0].message).toEqual('Invalid amount');
            });
        });
    });
});
