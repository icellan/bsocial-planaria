import bsv from 'bsv';
import { BSOCIAL } from '../bsocial';
import { LIKES } from '../likes';
import { COMMENTS } from '../comments';
import { REPOSTS } from '../reposts';
import { TIPS } from '../tips';

const updateActionStats = async function (map, idKey, collection, incField) {
  const { tx } = map;
  const _id = bsv.crypto.Hash.sha256(Buffer.from(`${idKey}${tx}`, 'hex')).toString('hex');
  const existing = await collection.findOne({ _id });
  if (!existing) {
    await collection.insert({
      _id,
      idKey,
      tx,
      t: Math.round(+new Date() / 1000),
    });
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
  if (map.type === 'post' && map.context === 'tx' && map.tx) {
    await updateActionStats(map, idKey, TIPS, 'tips');
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
        }
      }
    }
  }
};
