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
import twetch from './data/twetch.json';
import bitfs from './data/bitfs.json';
import { BSOCIAL_BITFS } from '../src/schemas/bsocial-bitfs';
import { TIPS } from '../dist/schemas/tips';
import { bSocialAfterInsert } from '../dist/schemas/hooks/bsocial-after-insert';

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
    expect(parsed.MAP[0].currency).toBe('USD');
    expect(parsed.MAP[0].amount).toBe('0.1');
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
  expect(bSocial.B[0].length).toEqual(14);
  expect(bSocial.B[0]['content-type']).toEqual('text/markdown');
  expect(bSocial.B[0].encoding).toEqual('UTF-8');
  expect(bSocial.AIP[0].address).toEqual('1PXpeXKc7TXrofPm5paDWziLjvcCDPvjnY');
  expect(bSocial.AIP[0].verified).toEqual(true);
  expect(bSocial.MAP[0].cmd).toEqual('SET');
  expect(bSocial.MAP[0].app).toEqual('_test');
  expect(bSocial.MAP[0].type).toEqual('post');
};

const bapReponse = {
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
};

describe('database functions', () => {
  beforeEach(async () => {
    fetch.mockResponse(req => {
      return bapReponse;
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
    const txId = '881b955dad644a8923db46a0efad783906365fd6751d56390839abac5383f122';
    const bSocial = await BSOCIAL.findOne({_id: txId});
    expect(bSocial.MAP.length).toEqual(1);
    expect(bSocial.MAP[0].type).toEqual('tip');
    expect(bSocial.MAP[0].currency).toEqual('USD');
    expect(bSocial.MAP[0].amount).toEqual('0.1');
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

describe('Twetch transaction', () => {
  beforeEach(async () => {
    await BSOCIAL.deleteMany({});
    await Errors.deleteMany({});
  });

  test('repost', async () => {
    await processBSocialTransaction(twetch[0]);
    const bSocial = await BSOCIAL.findOne({_id: 'dd4ac9404956b0aa5d9ed70f9d6e8c6868d05b40704e24e97daa649a0c84d6e6'});
    // normal content should not have been touched
    expect(bSocial.B[0].content).toEqual(undefined);
    expect(bSocial.B[0].length).toEqual(85);
    expect(bSocial.MAP[0].type).toEqual('repost');
    expect(bSocial.MAP[0].context).toEqual('tx');
    expect(bSocial.MAP[0].tx).toEqual('16b70974356dd2c191312cc9e75df12b19a3c216ec0650dde6adaafcaa95fc70');
  });

  test('reply', async () => {
    await processBSocialTransaction(twetch[1]);
    const bSocial = await BSOCIAL.findOne({_id: '0000324ded90f2459d83e454399f1136655378a3d1228c3c24f217069b1099c3'});
    // normal content should not have been touched
    expect(bSocial.B[0].content).toEqual("Apparently you need more than one handle to use that feature.");
    expect(bSocial.B[0].length).toEqual(61);
    expect(bSocial.MAP[0].type).toEqual('post');
    expect(bSocial.MAP[0].context).toEqual('tx');
    expect(bSocial.MAP[0].tx).toEqual('ca8b5ead89b42f744b4c43e4dcdb871e731a58c534abe0f7c00a1274ca35cf8d');
  });
});

describe('bitfs data', () => {
  beforeEach(async () => {
    await BSOCIAL.deleteMany({});
    await BSOCIAL_BITFS.deleteMany({});
    await Errors.deleteMany({});

    fetch.mockResponse(req => {
      if (req.url.match(/identity/)) {
        return bapReponse;
      } else {
        return {
          then() {
            return {
              text() {
                return "test text";
              }
            };
          }
        }
      }
    });
  });

  test('bitfs text', async () => {
    const tx = 'cdaaf016855b7920399277769add32eacfcd92d8e257955fef58397bb907da21';
    const url = `bitfs://${tx}.out.0.3`;

    const parsed = await parseBSocialTransaction(bitfs[0]);
    parsed.block = 697286;
    expect(parsed.B[0].content).toEqual(url);

    await processBSocialTransaction(parsed);
    const bSocial = await BSOCIAL.findOne({_id: tx});
    expect(bSocial.txId).toEqual(undefined);
    expect(bSocial.block).toEqual(697286);
    expect(bSocial.B[0].content).toEqual(url);
    expect(bSocial.B[0].length).toEqual(9);
    expect(bSocial.AIP[0].verified).toEqual(true);

    const bitfsData = await BSOCIAL_BITFS.findOne({_id: url});
    expect(bitfsData.content).toEqual('test text');
    expect(bitfsData['content-type']).toEqual('text/markdown');
    expect(bitfsData.length).toEqual(9);
    expect(bitfsData.tx).toEqual(tx);
  });
});
