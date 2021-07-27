import bsv from 'bsv';
import { BSOCIAL } from '../bsocial';
import { LIKES } from '../likes';
import { COMMENTS } from '../comments';
import { REPOSTS } from '../reposts';
import { TIPS } from '../tips';
import { PAYMENTS } from '../payments';
import { FOLLOWS } from '../follows';

const updateActionStats = async function (
  txId,
  map,
  idKey,
  collection,
  incField,
  additionalKeys = false,
) {
  const { tx } = map;
  const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${tx}`)).toString('hex');
  const existing = await collection.findOne({ _id });
  if (!existing) {
    let registerAction = {
      _id,
      txId,
      idKey,
      tx,
      t: Math.round(+new Date() / 1000),
    };
    if (additionalKeys) {
      registerAction = { ...registerAction, ...additionalKeys };
    }
    await collection.insert(registerAction);

    await BSOCIAL.updateOne({
      _id: tx,
    }, {
      $inc: {
        [incField]: 1,
      },
    }).catch((e) => {
      console.error('Failed updating BSocial updateActionStats', incField, e.reason || e.message);
    });
  }
};

const bSocialAfterInsertLike = async function (txId, map, idKey) {
  if (map.type === 'like' && map.context === 'tx' && map.tx) {
    await updateActionStats(txId, map, idKey, LIKES, 'likes');
  }
};

const bSocialAfterInsertRepost = async function (txId, map, idKey) {
  if (map.type === 'repost' && map.tx) {
    await updateActionStats(txId, map, idKey, REPOSTS, 'reposts');
  }
};

const bSocialAfterInsertComment = async function (txId, map, idKey) {
  if (map.type === 'post' && map.context === 'tx' && map.tx) {
    await updateActionStats(txId, map, idKey, COMMENTS, 'comments');
  }
};

const bSocialAfterInsertTip = async function (txId, map, idKey) {
  if (map.type === 'tip' && map.context === 'tx' && map.tx) {
    await updateActionStats(txId, map, idKey, TIPS, 'tips', {
      c: map.currency || '',
      a: Number(map.amount) || 0,
    });
  }
};

const bSocialAfterInsertPayment = async function (txId, map, doc) {
  if (
    map.type === 'payment'
    && map.context === 'tx'
    && map.tx
    && doc.BPP
    && doc.BPP[0]
    && doc.BPP[0].address
  ) {
    const { address } = doc.BPP[0];
    await updateActionStats(txId, map, address, PAYMENTS, 'payments', {
      decryptionKey: doc.BPP[0].apiEndpoint, // decryption key field when PAID
    });
  }
};

const bSocialAfterInsertFollow = async function (txId, map, idKey) {
  if (map.type === 'follow' && map.idKey) {
    const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${map.idKey}`)).toString('hex');
    const existing = await FOLLOWS.findOne({ _id });
    if (!existing) {
      const registerAction = {
        _id,
        txId,
        idKey,
        follows: map.idKey,
        t: Math.round(+new Date() / 1000),
      };
      await FOLLOWS.insert(registerAction);
    }
  }
};

const bSocialAfterInsertUnfollow = async function (txId, map, idKey) {
  if (map.type === 'unfollow' && map.idKey) {
    const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${map.idKey}`)).toString('hex');
    const existing = await FOLLOWS.findOne({ _id });
    if (existing) {
      await FOLLOWS.deleteOne({
        idKey,
        follows: map.idKey,
      });
    }
  }
};

export const bSocialAfterInsert = async function (doc) {
  // spec says the first AIP should be about the social stuff
  // second AIP should be the posting site if applicable
  if (doc.AIP && doc.AIP[0] && doc.AIP[0].verified === true) {
    // only process verified transactions
    const idKey = doc.AIP[0].bapId || Buffer.from(doc.AIP[0].address).toString('hex');
    if (doc.MAP) {
      const txId = doc._id;
      for (let i = 0; i < doc.MAP.length; i++) {
        const map = doc.MAP[i];
        if (map.type === 'like') {
          await bSocialAfterInsertLike(txId, map, idKey);
        } else if (map.type === 'repost') {
          await bSocialAfterInsertRepost(txId, map, idKey);
        } else if (map.type === 'post' && map.context === 'tx') {
          await bSocialAfterInsertComment(txId, map, idKey);
        } else if (map.type === 'tip' && map.context === 'tx') {
          await bSocialAfterInsertTip(txId, map, idKey);
        } else if (map.type === 'payment' && map.context === 'tx') {
          await bSocialAfterInsertPayment(txId, map, doc);
        } else if (map.type === 'follow' && map.idKey) {
          await bSocialAfterInsertFollow(txId, map, idKey);
        } else if (map.type === 'unfollow' && map.idKey) {
          await bSocialAfterInsertUnfollow(txId, map, idKey);
        }
      }
    }
  }
};
