import { HTLCTransaction as HTLCUnconfiguredTransaction } from './htlc';
import * as utils  from './utils';
import { HTLCConfig } from './interfaces';
import { HTLC_FEE } from './constants';

const configureHTLCTransaction = (config: HTLCConfig): any => {
    return class HTLCTransaction extends HTLCUnconfiguredTransaction {
        constructor(props) {
            super(props, config.fee || HTLC_FEE.toString());
        }
    }
};

const HTLCTransaction = configureHTLCTransaction({});

export {
    HTLCTransaction,
    configureHTLCTransaction as UnConfigureHTLCTransaction,
    utils,
}
