import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';
import { bSocialAfterInsert } from './hooks/bsocial-after-insert';

const BObject = new SimpleSchema({
  content: {
    type: String,
    optional: true,
  },
  url: {
    type: String,
    optional: true,
  },
  'content-type': {
    type: String,
    optional: true,
  },
  encoding: {
    type: String,
    optional: true,
  },
  filename: {
    type: String,
    optional: true,
  },
});

const AIPObject = new SimpleSchema({
  algorithm: {
    type: String,
    optional: false,
  },
  address: {
    type: String,
    optional: false,
  },
  bapId: {
    type: String,
    optional: true,
  },
  signature: {
    type: String,
    optional: false,
  },
  index: {
    type: Array,
    optional: true,
  },
  'index.$': {
    type: Number,
  },
  verified: {
    type: Boolean,
    optional: false,
  },
});

export const BSOCIAL = new Collection('bsocial', new SimpleSchema({
  block: {
    type: SimpleSchema.Integer,
    label: 'Block number this transaction was mined into - null if still in mempool',
    optional: true,
  },
  timestamp: {
    type: SimpleSchema.Integer,
    label: 'Timestamp this transaction was mined - null if still in mempool',
    optional: true,
  },
  B: {
    type: Array,
  },
  'B.$': {
    type: BObject,
  },
  MAP: {
    type: Array,
  },
  'MAP.$': {
    type: Object,
    blackbox: true,
  },
  AIP: {
    type: Array,
  },
  'AIP.$': {
    type: AIPObject,
  },
  likes: {
    type: Number,
  },
  reposts: {
    type: Number,
  },
  comments: {
    type: Number,
  },
  processed: {
    type: Boolean,
  },
}));

// all BSOCIAL inserts should be processed for stats
// signing has been verified
BSOCIAL.after('insert', async (doc) => {
  // process likes, comments, reposts etc.
  // update stats on context tx
  await bSocialAfterInsert(doc);

  await BSOCIAL.update({
    _id: doc._id,
  }, {
    $set: {
      processed: true,
    },
  });
});
