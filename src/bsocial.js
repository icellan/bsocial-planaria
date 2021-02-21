import es from 'event-stream';
import BMAP from 'bmapjs';
import 'node-fetch';
import { bmapQuerySchemaHandler } from 'bmapjs/dist/utils';
import {
  DEBUG,
  MAP_BITCOM_ADDRESS,
  TOKEN,
  bapApiUrl,
} from './config';
import { BSOCIAL } from './schemas/bsocial';
import { Errors } from './schemas/errors';
import { getBitbusBlockEvents } from './get';
import { getStatusValue, updateStatusValue } from './status';
import { cleanDocumentKeys } from './lib/utils';

export const FIRST_BSOCIAL_BLOCK = 671145;

export const getBitsocketQuery = function (lastBlockIndexed = false, queryFind = false) {
  queryFind = queryFind || {
    $and: [
      {
        'out.tape.cell': {
          $elemMatch: {
            i: 0,
            s: MAP_BITCOM_ADDRESS,
          },
        },
      },
      {
        'out.tape.cell': {
          $elemMatch: {
            i: 1,
            s: 'SET',
          },
        },
      },
      {
        'out.tape.cell': {
          $elemMatch: {
            i: 2,
            s: 'app',
          },
        },
      },
      {
        'out.tape.cell': {
          $elemMatch: {
            i: 4,
            s: 'type',
          },
        },
      },
      {
        'out.tape.cell': {
          $elemMatch: {
            i: 5,
            s: {
              $in: ['post', 'like', 'follow', 'unfollow', 'attachment', 'tip', 'payment'],
            },
          },
        },
      },
    ],
  };

  const query = {
    q: {
      find: queryFind,
      sort: {
        'blk.i': 1,
      },
      project: {
        blk: 1,
        'tx.h': 1,
        out: 1,
        in: 1, // we need in for METANET
      },
    },
  };

  if (lastBlockIndexed) {
    query.q.find['blk.i'] = {
      $gt: lastBlockIndexed,
    };
  }

  return query;
};

export const updateLastBlock = async function (block) {
  return updateStatusValue('lastBSocialBlock', block);
};

export const getLastBlockIndex = async function () {
  const lastBlockIndex = await getStatusValue('lastBSocialBlock');
  return lastBlockIndex ? Number(lastBlockIndex) : FIRST_BSOCIAL_BLOCK;
};

export const addErrorTransaction = async function (op) {
  delete op._id;
  return Errors.updateOne({
    _id: op.txId,
  }, {
    $set: op,
  }, {
    upsert: true,
  });
};

const getBAPIdByAddress = async function (address, block, timestamp) {
  // use BAP API
  // TODO: allow to set a mongoUrl and use a local instance, using the BAP class
  if (bapApiUrl) {
    // fetch ...
    const result = await fetch(`${bapApiUrl}/identity/validByAddress`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        block,
        timestamp,
      }),
    });
    const data = await result.json();
    if (data && data.status === 'OK' && data.result) {
      return data.result;
    }
  }

  return false;
};

export const processBSocialTransaction = async function (transaction) {
  if (!transaction) return;

  const query = { _id: transaction.txId, ...transaction };
  delete query.txId;
  query.processed = false;

  // get BAP IDs for given social op
  if (query.AIP) {
    for (let i = 0; i < query.AIP.length; i++) {
      const { address } = query.AIP[i];
      const bap = await getBAPIdByAddress(address, transaction.block, transaction.timestamp);
      if (bap && bap.valid === true) {
        query.AIP[i].bapId = bap.idKey;
      }
    }
  }

  // check for binary / encrypted B data
  if (query.B) {
    for (let i = 0; i < query.B.length; i++) {
      try {
        if (query.B[i]['content-type'].match(/ecies$/)) {
          // store the encrypted stuff as hex - binary does not survive storing to Mongo
          // the bmap parser does not understand this yet, maybe it should be added there
          query.B[i].content = Buffer.from(query.B[i].content, 'binary').toString('hex');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  const existing = await BSOCIAL.findOne({ _id: query._id });
  if (existing) {
    // update
    const bSocialId = query._id;
    delete query._id;
    if (existing.timestamp) {
      // do not update timestamp if already set, we'll use the original one from the mempool
      delete query.timestamp;
    }

    await BSOCIAL.updateOne({
      _id: bSocialId,
    }, {
      $set: query,
    })
      .catch((e) => {
        console.error(e);
      });
  } else {
    // insert
    await BSOCIAL.insert(query)
      .catch((e) => {
        console.error(e);
      });
  }
};

/**
 * Parse the Bitcoin Social transaction and return a clean document
 * @param op
 */
export const parseBSocialTransaction = async function (op) {
  try {
    const bmap = new BMAP();

    // add the BPP handler
    const querySchema = [
      { action: 'string' },
      { currency: 'string' },
      { address: 'string' },
      { apiEndpoint: 'string' },
    ];
    const handler = bmapQuerySchemaHandler.bind(bmap, 'BPP', querySchema);
    bmap.addProtocolHandler({
      name: 'BPP',
      address: 'BPP',
      querySchema,
      handler,
    });

    const bSocialOp = cleanDocumentKeys(await bmap.transformTx(op));
    bSocialOp.txId = bSocialOp.tx.h;

    delete bSocialOp.in;
    delete bSocialOp.out;
    delete bSocialOp.tx;
    delete bSocialOp.lock;
    delete bSocialOp.blk;

    const keysToTransform = ['B', 'AIP', 'MAP', 'BPP'];
    keysToTransform.forEach((key) => {
      if (bSocialOp[key] && !Array.isArray(bSocialOp[key])) {
        bSocialOp[key] = [bSocialOp[key]];
      }
    });

    return bSocialOp;
  } catch (e) {
    if (DEBUG) console.error(e.message, JSON.stringify(op));
    return false;
  }
};

export const processBlockEvents = async function (op) {
  try {
    const txId = op.tx.h;
    const block = op.blk && op.blk.i;
    const timestamp = (op.blk && op.blk.t) || Math.round((+new Date()) / 1000);

    console.log('got bSocial transaction', txId, block || 'mempool');
    /* eslint-disable no-await-in-loop */
    const bSocialOp = await parseBSocialTransaction(op);
    if (bSocialOp) {
      bSocialOp._id = txId;
      bSocialOp.block = block;
      bSocialOp.timestamp = timestamp;

      /* eslint-disable no-await-in-loop */
      await processBSocialTransaction(bSocialOp);
      if (bSocialOp.block) {
        await updateLastBlock(bSocialOp.block);
      }
    } else {
      op.txId = txId;
      op.block = block;
      await addErrorTransaction(op);
    }
  } catch (e) {
    op.error = JSON.stringify(e, Object.getOwnPropertyNames(e));
    await addErrorTransaction(op);
  }
};

export const indexBSocialTransactions = async function (queryFind) {
  const lastBlockIndexed = await getLastBlockIndex();
  const query = getBitsocketQuery(lastBlockIndexed, queryFind);

  const data = await getBitbusBlockEvents(query);
  for (let i = 0; i < data.length; i++) {
    await processBlockEvents(data[i]);
  }

  return true;
};

export const indexBSocialTransactionsStream = async function (queryFind = false) {
  const lastBlockIndexed = await getLastBlockIndex();

  if (DEBUG) console.log('POST https://bob.bitbus.network/block');
  const response = await fetch('https://bob.bitbus.network/block', {
    method: 'post',
    headers: {
      'Content-type': 'application/json; charset=utf-8',
      token: TOKEN,
      from: FIRST_BSOCIAL_BLOCK,
    },
    body: JSON.stringify(getBitsocketQuery(lastBlockIndexed, queryFind)),
  });

  return new Promise((resolve, reject) => {
    if (DEBUG) console.log('PROCESSING BODY');
    response.body.on('sfinish', () => {
      if (DEBUG) console.log('FINISHED BODY');
      resolve();
    });
    response.body.on('end', () => {
      if (DEBUG) console.log('END BODY');
      resolve();
    });
    response.body.on('error', (e) => {
      if (DEBUG) console.error(e);
      reject(e);
    });
    response.body
      .pipe(es.split(), { end: false })
      .pipe(es.mapSync(async (data) => {
        if (data) {
          const event = JSON.parse(data);
          await processBlockEvents(event);
        }
      }), { end: false });
  });
};
