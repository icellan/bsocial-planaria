import { describe, expect, beforeEach, afterEach, test, } from '@jest/globals';
import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();
import { BSOCIAL } from '../src/schemas/bsocial';
import { Errors } from '../src/schemas/errors';
import { Status } from '../src/schemas/status';
import {
  getBitsocketQuery,
  parseBSocialTransaction,
  processBSocialTransaction,
  updateLastBlock,
  getLastBlockIndex,
  addErrorTransaction, processBlockEvents,
} from '../src/bsocial';

import ops from './data/ops.json';
import bpp from './data/bpp.json';
import bsocial from './data/bsocial.json';

describe('getBitsocketQuery', () => {
  test('lastBlockIndexed', () => {
    const query = getBitsocketQuery(123123);
    expect(typeof query).toBe('object');
    expect(query.q.find['blk.i'].$gt).toBe(123123);
  });
});

describe('parseBSocialTransaction', () => {
  beforeEach(async () => {
    await BSOCIAL.deleteMany({});
    await Errors.deleteMany({});
  });

  test('parse basic', async () => {
    const parsed = await parseBSocialTransaction(ops[0]);
    expect(typeof parsed).toBe('object');
    expect(typeof parsed.B[0]).toBe('object');
    expect(typeof parsed.MAP[0]).toBe('object');
    expect(typeof parsed.AIP[0]).toBe('object');
    expect(parsed.B[0].content).toBe('Hello World!\n\n');
    expect(parsed.MAP[0].app).toBe('_test');
    expect(parsed.AIP[0].verified).toBe(true);
  });

  test('parse tip', async () => {
    const parsed = await parseBSocialTransaction(ops[2]);
    expect(typeof parsed).toBe('object');
    expect(typeof parsed.MAP[0]).toBe('object');
    expect(parsed.MAP[0].app).toBe('_test');
    expect(parsed.MAP[0].type).toBe('tip');
    expect(parsed.MAP[0].context).toBe('tx');
    expect(parsed.MAP[0].tx).toBe('fa27f91587ee48f10ee1c8859c6daccdd90e11d59d2fe4d9947ae7620be2754d');
  });

  test('parse incorrect ', async () => {
    const parsed = await parseBSocialTransaction({});
    expect(typeof parsed).toBe('boolean');
    expect(parsed).toBe(false);
  });
});

const testDBInsert = function (bSocial) {
  expect(bSocial._id).toEqual('7c05aea3cd9474641a3f89f15b730fa1290d9dedcfc08713b80abb3b885e796b');
  expect(bSocial.B[0].content).toEqual('Hello World!'); // trimmed after db insert !
  expect(bSocial.B[0]['content-type']).toEqual('text/markdown');
  expect(bSocial.B[0].encoding).toEqual('UTF-8');
  expect(bSocial.AIP[0].address).toEqual('1PXpeXKc7TXrofPm5paDWziLjvcCDPvjnY');
  expect(bSocial.AIP[0].verified).toEqual(true);
  expect(bSocial.MAP[0].cmd).toEqual('SET');
  expect(bSocial.MAP[0].app).toEqual('_test');
  expect(bSocial.MAP[0].type).toEqual('post');
};

describe('database functions', () => {
  beforeEach(async () => {
    fetch.mockResponse(req => {
      return {
        then() {
          return {
            json() {
              return {
                status: 'OK',
                result: {
                  status: 'ERROR',
                  message: 'Could not find identity',
                  errorCode: 404,
                },
              }
            }
          };
        }
      }
    });
    await BSOCIAL.deleteMany({});
    await Errors.deleteMany({});
  });

  test('processBSocialTransaction', async () => {
    const parsed = await parseBSocialTransaction(ops[0]);

    await processBSocialTransaction(parsed);
    const bSocial = await BSOCIAL.findOne({_id: '7c05aea3cd9474641a3f89f15b730fa1290d9dedcfc08713b80abb3b885e796b'});
    expect(bSocial.txId).toEqual(undefined);
    expect(bSocial.block).toEqual(undefined);
    testDBInsert(bSocial);

    const mined = Object.assign({}, parsed);
    mined.block = 621342;
    mined.timestamp = 1581256115;
    await processBSocialTransaction(mined);
    const bSocialMined = await BSOCIAL.findOne({_id: '7c05aea3cd9474641a3f89f15b730fa1290d9dedcfc08713b80abb3b885e796b'});
    expect(bSocialMined.block).toEqual(621342);
    expect(bSocialMined.timestamp).toEqual(1581256115);
    testDBInsert(bSocialMined);
  });

  test('processBlockEvents', async () => {
    await processBlockEvents(ops[0]);
    const bSocial = await BSOCIAL.findOne({_id: '7c05aea3cd9474641a3f89f15b730fa1290d9dedcfc08713b80abb3b885e796b'});
    expect(bSocial.txId).toEqual(undefined);
    expect(bSocial.block).toEqual(undefined);
    testDBInsert(bSocial);
  });

  test('processBlockEvents tip', async () => {
    await processBlockEvents(ops[2]);
    const bSocial = await BSOCIAL.findOne({_id: '881b955dad644a8923db46a0efad783906365fd6751d56390839abac5383f122'});
    expect(bSocial.MAP.length).toEqual(1);
    expect(bSocial.MAP[0].type).toEqual('tip');
    expect(bSocial.timestamp).toEqual(1612303485);
    expect(bSocial.processed).toEqual(true);
  });

  test('processBlockEvents error', async () => {
    await processBlockEvents({tx: {h: 'tx123'}});
    const error = await Errors.findOne({_id: 'tx123'});
    expect(error).toEqual({
        _id: 'tx123',
        block: null,
        tx: { h: 'tx123' },
        txId: 'tx123',
      });
  });

  test('processBSocialTransaction with image', async () => {
    const parsed = await parseBSocialTransaction(ops[1]);

    await processBSocialTransaction(parsed);
    const bSocial = await BSOCIAL.findOne({_id: '868e663652556fa133878539b6c65093e36bef1a6497e511bdf0655b2ce1c935'});
    expect(bSocial.txId).toEqual(undefined);
    expect(bSocial.block).toEqual(671237);
    expect(bSocial.AIP[0].verified).toEqual(false); // files are not supported :-(
  });

  test('updateLastBlock', async () => {
    await updateLastBlock(123123);
    const status = await Status.findOne({_id: 'lastBSocialBlock'});
    expect(status.value).toEqual("123123");
    expect(await getLastBlockIndex()).toEqual(123123);

    await updateLastBlock(123124);
    const status2 = await Status.findOne({_id: 'lastBSocialBlock'});
    expect(status2.value).toEqual("123124");
    expect(await getLastBlockIndex()).toEqual(123124);
  });

  test('addErrorTransaction', async () => {
    await addErrorTransaction({
      txId: '123123123',
      test: 'test',
    });
    const error = await Errors.findOne({_id: '123123123'});
    expect(error.txId).toEqual('123123123');
    expect(error.test).toEqual('test');
  });
});

describe('BPP transaction', () => {
  beforeEach(async () => {
    await BSOCIAL.deleteMany({});
    await Errors.deleteMany({});
  });

  test('parse basic', async () => {
    const parsed = await parseBSocialTransaction(bpp[0]);
    expect(typeof parsed).toBe('object');
    expect(typeof parsed.B[0]).toBe('object');
    expect(typeof parsed.MAP[0]).toBe('object');
    expect(typeof parsed.AIP[0]).toBe('object');
    expect(typeof parsed.BPP[0]).toBe('object');
    expect(parsed.B[0].content).toBe('This is a test paywall transaction.\n\n');
    expect(parsed.MAP[0].app).toBe('_test');

    expect(parsed.BPP[0].action).toBe('PAY');
    expect(parsed.BPP[0].currency).toBe('USD');
    expect(parsed.BPP[0].address).toBe('user@moneybutton.com:0.09,blockpost@moneybutton.com:0.01');
    expect(parsed.BPP[0].apiEndpoint).toBe('https://blockpost.network/v1/paywall');
  });
});

describe('ECIES transaction', () => {
  beforeEach(async () => {
    await BSOCIAL.deleteMany({});
    await Errors.deleteMany({});
  });

  test('parse basic', async () => {
    await processBSocialTransaction(bsocial[0]);
    const bSocial = await BSOCIAL.findOne({_id: 'a78e5172303e629d0197b68daa2bce03ac1a5c111054d40b738cc19cc24702c0'});
    // normal content should not have been touched
    expect(bSocial.B[0].content).toEqual('This is a test paywall transaction.');
    // ecies content should be hexed
    expect(bSocial.B[1].content).toEqual('424945');
  });
});
