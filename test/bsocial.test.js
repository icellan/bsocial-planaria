import { describe, expect, beforeEach, afterEach, test, } from '@jest/globals';
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

describe('getBitsocketQuery', () => {
  test('lastBlockIndexed', () => {
    const query = getBitsocketQuery(123123);
    expect(typeof query).toBe('object');
    expect(query.q.find['blk.i'].$gt).toBe(123123);
  });
});

describe('parseBSocialTransaction', () => {
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
