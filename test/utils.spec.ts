import { getTimeFromBlockchainEpoch, getTimeWithOffset, hashKey, verifyKey } from '../src/utils';

describe('Test utils', () => {
    it('should get the right time with offset', () => {
        expect(typeof getTimeWithOffset(1000)).toBe('number');
    });

    it('should get the right time with offset', () => {
        expect(typeof getTimeWithOffset()).toBe('number');
    });

    it('should get the right time with offset', () => {
        expect(getTimeWithOffset(1000) - getTimeWithOffset()).toBe(1000);
    });

    it('should get the right time from epoch', async () => {
        expect(typeof getTimeFromBlockchainEpoch()).toBe('number');
    });

    it('should return a SHA256 hash', async () => {
        const hash = hashKey('secretKey', "OP_HASH256");
        expect(hash).toBe('b23813da7f066be253e3bdfa41f87e010b585ff970ff54e428fdcc34b0ad1e50');
        expect(verifyKey(hash, 'secretKey')).toBeTruthy();
    });

    it('should return a SHA256 hash', async () => {
        expect(hashKey('secretKey')).toBe('b23813da7f066be253e3bdfa41f87e010b585ff970ff54e428fdcc34b0ad1e50')
    });

    it('should return a RIPE160 hash', async () => {
        expect(hashKey('secretKey', "OP_HASH160")).toBe('539fb12644253b13b152e096260807120c181d5b')
    });
});
