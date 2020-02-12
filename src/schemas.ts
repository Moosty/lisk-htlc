export const HTLCAssetUnlockFormatSchema = {
    type: 'object',
    required: ['contractId', 'secret'],
    properties: {
        contractId: {
            type: 'string',
            format: 'address',
        },
        secret: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};

export const HTLCAssetRefundFormatSchema = {
    type: 'object',
    required: ['contractId', 'data'],
    properties: {
        contractId: {
            type: 'string',
            format: 'address',
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};

export const HTLCAssetLockFormatSchema = {
    type: 'object',
    required: ['contractId', 'amount', 'recipientPublicKey', 'time', 'type', 'data', 'secretLength'],
    properties: {
        contractId: {
            type: 'string',
            format: 'address',
        },
        amount: {
            type: 'string',
            format: 'amount',
        },
        type: {
            type: 'string',
            maxLength: 10,
        },
        time: {
            type: 'integer',
            min: 1,
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
        secretLength: {
            type: 'integer',
            min: 6,
            max: 64,
        },
        recipientPublicKey: {
            type: 'string',
            maxLength: 64,
        },
    },
};
