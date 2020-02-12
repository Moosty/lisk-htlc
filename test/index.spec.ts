import { UnConfigureHTLCTransaction } from "../src";
import {validTransactions} from "../fixtures";
import { HTLC_FEE } from "../src/constants";

describe('Test index', () => {

    it('should return a basic transaction', () => {
        const TX = UnConfigureHTLCTransaction({});
        const testTx = new TX(validTransactions[0].input);
        expect((testTx.toJSON()).fee).toBe(HTLC_FEE.toString());
    });

    it('should return a configured transaction', () => {
        const TX = UnConfigureHTLCTransaction({
            fee: '500000000'
        });
        const testTx = new TX(validTransactions[0].input);

        expect((testTx.toJSON()).fee).toBe('500000000');
    });
});
