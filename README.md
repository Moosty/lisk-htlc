# Lisk Hash Time Locked Contract transaction
[![Build Status](https://travis-ci.org/moosty/lisk-htlc.svg?branch=master)](https://travis-ci.org/moosty/lisk-htlc)
[![Coverage Status](https://img.shields.io/codecov/c/github/moosty/lisk-htlc.svg)](https://codecov.io/gh/moosty/lisk-htlc/list/master/)
[![Dependencies Status](https://david-dm.org/moosty/lisk-htlc.svg)](https://david-dm.org/moosty/lisk-htlc)
[![DeepScan grade](https://deepscan.io/api/teams/7455/projects/9545/branches/125748/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=7455&pid=9545&bid=125748)
[![Lisk SDK Status](https://img.shields.io/github/package-json/dependency-version/moosty/lisk-htlc/lisk-sdk.svg)](https://github.com/liskhq/lisk-sdk/)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

Simpely add this transaction to your Lisk SDK based blockchain application.
It allows for atomic swap between other blockchains that allow atomic swap by using Hash Time Locked Contracts.

**This is by no means meant to support the production phase yet.**

# How does it work
Send an amount of token, from your wallet on a blockchain application made with the Lisk SDK, to a hash time locked contract 
using this custom transaction `HTLC-transaction`. After successfully completing the `HTLC-Transaction` the amount will be 
locked inside the contract wallet. To redeem the locked amount, the recipient can unlock the HTLC by sending the `HTLC-transaction` 
to the contract wallet with the secret included. If the secret is valid and the transaction is not timed out, the locked funds in 
the contract wallet will be send to the recipient wallet. 
If the contract is expired, the initial creator of the contract can send a refund `HTLC-transaction` to the contract wallet
 and will receive the funds minus the initial fees back. 

# Installation
`npm install --save @moosty/lisk-htlc`

or

`yarn add @moosty/lisk-htlc`

# Usage
Register the transaction to your blockchain application.
```javascript
import { HTLCTransaction } from '@moosty/lisk-htlc';

App.registerTransaction(HTLCTransaction);
```

Configure the transaction fee and register the HTLC-transaction to your blockchain application.
```javascript
import { UnConfigureHTLCTransaction } from '@moosty/lisk-htlc';

const HTLCTransaction = UnConfigureHTLCTransaction({ fee: '500000000' });
App.registerTransaction(HTLCTransaction);
```

The HTLC transaction is a combination of three sub-transactions. 
1. Lock contract transaction
2. Redeem contract transaction
3. Refund contract transaction

## Examples
### Lock contract transaction
```javascript
import { HTLCTransaction } from '@moosty/lisk-htlc';
const LockContractTransaction = new HTLCTransaction({
  "passphrase": string, // string passphrase from senderId
  "type": 199,
  "timestamp": number,
  "asset": {
     "time": number,
     "recipientPublicKey": "", // string recipient publicKey
     "type": "", // string [ OP_HASH160 | OP_HASH256 ]
     "data": "", // string preimage hash
     "secretLength": number, // number length preimage
     "amount": "", // string amount to be locked
  },
  "networkIdentifier": "" // string network Identifier
});

// broadcast LockContractTransaction.toJSON() to blockchain application nodes
```
### Redeem contract transaction
```javascript
import { HTLCTransaction } from '@moosty/lisk-htlc';
const RedeemContractTransaction = new HTLCTransaction({
  "passphrase": string, // string passphrase from recipientId
  "type": 199,
  "timestamp": number,
  "asset": {
     "contractId": "", // string contractId
     "secret": "", // string preimage
  },
  "networkIdentifier": "" // string network Identifier
});

// broadcast RedeemContractTransaction.toJSON() to blockchain application nodes
```
### Refund contract transaction
```javascript
import { HTLCTransaction } from '@moosty/lisk-htlc';
const RefundContractTransaction = new HTLCTransaction({
  "passphrase": string, // string passphrase from senderId
  "type": 199,
  "timestamp": number,
  "asset": {
     "contractId": "", // string contractId
     "data": "", // string preimage
  },
  "networkIdentifier": "" // string network Identifier
});

// broadcast RefundContractTransaction.toJSON() to blockchain application nodes
```


# Todos
```
- [X] Configurable fee amount
- [ ] Better determanistic time lock
- [ ] Documentation
- [ ] Live chain tests
```

# Use case
The `HTLC-transaction` functions as a interoperability option to transfer tokens between different blockchain applications.
The transaction can facilitate Atomic Swaps between different blockchain tokens. To help better adoption of this transaction
we are building a decentralized exchange to help connect users from different blockchain applications. Atomic Swap between 
your Lisk SDK based blockchain application and Bitcoin, Ethereum or any other Lisk SDK based blockchain with the 
`lisk-htlc` transaction is coming soon with [Mercator.network](https://mercator.network).  

# License
Copyright © 2019 - 2020 Moosty Team

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see http://www.gnu.org/licenses/.
