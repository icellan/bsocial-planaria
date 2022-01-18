import BMAP from 'bmapjs';
import 'node-fetch';
import { bmapQuerySchemaHandler } from 'bmapjs/dist/utils';
import {
  DEBUG,
  VERBOSE,
  MAP_BITCOM_ADDRESS,
  bapApiUrl,
  BITFS_STORE,
  BITFS_MAX_CONTENT_LENGTH,
} from './config';
import { BSOCIAL } from './schemas/bsocial';
import { Errors } from './schemas/errors';
import { getBitbusStreamingEvents } from './get';
import { getStatusValue, updateStatusValue } from './status';
import { cleanDocumentKeys } from './lib/utils';
import { getDB } from './lib/db';
import { BSOCIAL_BITFS } from './schemas/bsocial-bitfs';

export const FIRST_BSOCIAL_BLOCK = 671145;

export const BSOCIAL_VALID_ACTIONS = [
  'post',
  'repost',
  'like',
  'follow',
  'unfollow',
  'attachment',
  'tip',
  'payment',
  'comment',
];

export const getBitsocketQuery = function (
  lastBlockIndexed = false,
  queryFind = false,
) {
  queryFind = queryFind || {
    $and: [
      {
        'out.tape.cell.s': MAP_BITCOM_ADDRESS,
      }, {
        'out.tape.cell.s': {
          $in: BSOCIAL_VALID_ACTIONS,
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
  return updateStatusValue('lastBSocialBlock', '' + block);
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

let bapDB;
export const getBAPIdByAddress = async function (address, block, timestamp) {
  if (bapApiUrl) {
    if (bapApiUrl.match(/^mongodb(\+srv)?:\/\//)) {
      // This uses the local mongodb, which should be up2date with a bap-planaria
      if (!bapDB) {
        bapDB = await getDB(bapApiUrl);
      }
      const bap = await bapDB.collection('id')
        .findOne({
          'addresses.address': address,
        });
      if (bap) {
        // TODO check whether it is valid at block / timestamp
        return {
          idKey: bap._id,
          valid: true,
        };
      }
    } else {
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
  }

  return false;
};

export const bitfsUrl = 'https://x.bitfs.network/';
export const getBitfsContent = async function (url) {
  const getUrl = url.replace('bitfs://', bitfsUrl);
  const response = await fetch(getUrl);
  if (response && response.status === 200) {
    return response.text();
  }
  return null;
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

  // Twetch does not follow BSocial protocol 100%
  const bSocialReply = query.MAP[0]?.context === 'tx' && query.MAP[0]?.tx;
  const twetchPost = query.MAP[0]?.app === 'twetch';
  const twetchReply = twetchPost && query.MAP[0]?.reply && query.MAP[0]?.reply !== 'null';
  if (twetchReply && !bSocialReply) {
    query.MAP[0].context = 'tx';
    query.MAP[0].tx = query.MAP[0].reply;
  }

  // check for binary / encrypted B data
  if (query.B) {
    for (let i = 0; i < query.B.length; i++) {
      if (query.B[i].content.match(/^bitfs:\/\/[0-9a-z\.]+$/)) {
        // store the bitfs content in the database, but only text
        if (BITFS_STORE && query.B[i]['content-type']?.match(/^text/)) {
          try {
            const url = query.B[i].content;
            const bitfsContent = await getBitfsContent(url).catch((e) => { console.error(e); });
            if (bitfsContent && bitfsContent.length <= BITFS_MAX_CONTENT_LENGTH) {
              // no need to wait ...
              await BSOCIAL_BITFS.upsert({
                _id: url,
              }, {
                $set: {
                  _id: url,
                  content: bitfsContent,
                  'content-type': query.B[i]['content-type'],
                  length: bitfsContent.length,
                  tx: query._id,
                },
              });
              query.B[i].length = bitfsContent.length;
            }
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        query.B[i].length = query.B[i].content.length;
      }

      try {
        if (query.B[i]['content-type']?.match(/ecies$/)) {
          // store the encrypted stuff as hex - binary does not survive storing to Mongo
          // the bmap parser does not understand this yet, maybe it should be added there
          query.B[i].content = Buffer.from(query.B[i].content, 'binary')
            .toString('hex');
        }
      } catch (e) {
        console.error(e);
      }
    }

    const twetchUrlRegex = new RegExp('https://twetch.app/t/([0-9a-zA-Z]+)', 'i');
    const twetchRepost = twetchPost && query.B[0]?.content?.match(twetchUrlRegex);
    if (twetchRepost && twetchRepost[1]) {
      const twetchTx = twetchRepost[1];
      query.B[0].content = query.B[0].content.replace(twetchUrlRegex, '');
      query.MAP[0].type = 'repost';
      query.MAP[0].context = 'tx';
      query.MAP[0].tx = twetchTx;
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
        console.error('Failed updating bSocial tx', bSocialId, e.reason || e.message);
      });
  } else {
    // insert
    await BSOCIAL.insert(query)
      .catch((e) => {
        console.error('Failed inserting bSocial tx ', query._id, e.reason || e.message);
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
    bSocialOp._id = bSocialOp.txId;

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

export const isBSocialOp = function (op) {
  if (op.MAP && op.MAP.length > 0) {
    return !!op.MAP.find((map) => {
      return map.cmd === 'SET'
        && map.app
        && BSOCIAL_VALID_ACTIONS.includes(map.type);
    });
  }

  return false;
};

let blockIndex;
export const processBlockEvents = async function (op) {
  try {
    const txId = op.tx.h;
    const block = op.blk && op.blk.i;
    const timestamp = (op.blk && op.blk.t) || Math.round((+new Date()) / 1000);

    /* eslint-disable no-await-in-loop */
    const bSocialOp = await parseBSocialTransaction(op);
    if (isBSocialOp(bSocialOp)) {
      if (VERBOSE) console.log('got bSocial transaction', txId, block || 'mempool');

      bSocialOp._id = txId;
      bSocialOp.block = block;
      bSocialOp.timestamp = timestamp;

      /* eslint-disable no-await-in-loop */
      await processBSocialTransaction(bSocialOp);
      if (bSocialOp.block && bSocialOp.block !== blockIndex) {
        if (VERBOSE) console.log('UPDATE BLOCK', bSocialOp.block, typeof bSocialOp.block);
        await updateLastBlock(blockIndex);
        blockIndex = bSocialOp.block;
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
  blockIndex = lastBlockIndexed;
  const query = getBitsocketQuery(lastBlockIndexed, queryFind);

  await getBitbusStreamingEvents(query, lastBlockIndexed, async (event) => {
    await processBlockEvents(event);
  });

  return true;
};
