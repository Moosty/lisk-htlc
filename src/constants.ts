import BigNum from '@liskhq/bignum';
const FIXED_POINT = 10 ** 8;
export const HTLC_FEE = new BigNum(FIXED_POINT * .2);
export const HTLC_TYPE = 199;
export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();
export const MS_FACTOR = 1000;
export const EPOCH_TIME_SECONDS = Math.floor(EPOCH_TIME.getTime() / MS_FACTOR);
export const MIN_LOCK_TIME = 120;
export const subTypes = {
    LOCK: 0,
    UNKNOWN: 1,
    UNLOCK: 2,
    REFUND: 3,
};
