import bsv from 'bsv';
import { BSOCIAL } from '../bsocial';
import { LIKES } from '../likes';
import { COMMENTS } from '../comments';
import { REPOSTS } from '../reposts';
import { TIPS } from '../tips';
import { PAYMENTS } from '../payments';
import { FOLLOWS } from '../follows';

const updateActionStats = async function (
  map,
  idKey,
  collection,
  incField,
  additionalKeys = false,
) {
  const { tx } = map;
  const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${tx}`, 'hex')).toString('hex');
  const existing = await collection.findOne({ _id });
  if (!existing) {
    let registerAction = {
      _id,
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
    });
  }
};

const bSocialAfterInsertLike = async function (map, idKey) {
  if (map.type === 'like' && map.context === 'tx' && map.tx) {
    await updateActionStats(map, idKey, LIKES, 'likes');
  }
};

const bSocialAfterInsertRepost = async function (map, idKey) {
  if (map.type === 'repost' && map.tx) {
    await updateActionStats(map, idKey, REPOSTS, 'reposts');
  }
};

const bSocialAfterInsertComment = async function (map, idKey) {
  if (map.type === 'post' && map.context === 'tx' && map.tx) {
    await updateActionStats(map, idKey, COMMENTS, 'comments');
  }
};

const bSocialAfterInsertTip = async function (map, idKey) {
  if (map.type === 'tip' && map.context === 'tx' && map.tx) {
    await updateActionStats(map, idKey, TIPS, 'tips');
  }
};

const bSocialAfterInsertPayment = async function (map, doc) {
  if (
    map.type === 'payment'
    && map.context === 'tx'
    && map.tx
    && doc.BPP
    && doc.BPP[0]
    && doc.BPP[0].address
  ) {
    const { address } = doc.BPP[0];
    await updateActionStats(map, address, PAYMENTS, 'payments', {
      decryptionKey: doc.BPP[0].apiEndpoint, // decryption key field when PAID
    });
  }
};

const bSocialAfterInsertFollow = async function (map, idKey) {
  if (map.type === 'follow' && map.idKey) {
    const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${map.idKey}`, 'hex')).toString('hex');
    const existing = await FOLLOWS.findOne({ _id });
    if (!existing) {
      const registerAction = {
        _id,
        idKey,
        follows: map.idKey,
        t: Math.round(+new Date() / 1000),
      };
      await FOLLOWS.insert(registerAction);
    }
  }
};

const bSocialAfterInsertUnfollow = async function (map, idKey) {
  if (map.type === 'unfollow' && map.idKey) {
    const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${map.idKey}`, 'hex')).toString('hex');
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
      for (let i = 0; i < doc.MAP.length; i++) {
        const map = doc.MAP[i];
        if (map.type === 'like') {
          await bSocialAfterInsertLike(map, idKey);
        } else if (map.type === 'repost') {
          await bSocialAfterInsertRepost(map, idKey);
        } else if (map.type === 'post' && map.context === 'tx') {
          await bSocialAfterInsertComment(map, idKey);
        } else if (map.type === 'tip' && map.context === 'tx') {
          await bSocialAfterInsertTip(map, idKey);
        } else if (map.type === 'payment' && map.context === 'tx') {
          await bSocialAfterInsertPayment(map, doc);
        } else if (map.type === 'follow' && map.idKey) {
          await bSocialAfterInsertFollow(map, idKey);
        } else if (map.type === 'unfollow' && map.idKey) {
          await bSocialAfterInsertUnfollow(map, idKey);
        }
      }
    }
  }
};
