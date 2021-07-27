import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';
import { bSocialAfterInsert } from './hooks/bsocial-after-insert';

const BObject = new SimpleSchema({
  content: {
    type: String,
    optional: true,
  },
  length: {
    type: Number,
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

const BPPObject = new SimpleSchema({
  action: {
    type: String,
    optional: false,
  },
  currency: {
    type: String,
    optional: false,
  },
  address: {
    type: String,
    optional: false,
  },
  apiEndpoint: {
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
    optional: true,
  },
  'B.$': {
    type: BObject,
  },
  MAP: {
    type: Array,
    optional: false,
  },
  'MAP.$': {
    type: Object,
    blackbox: true,
  },
  AIP: {
    type: Array,
    optional: true,
  },
  'AIP.$': {
    type: AIPObject,
  },
  BPP: {
    type: Array,
    optional: true,
  },
  'BPP.$': {
    type: BPPObject,
  },
  likes: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  reposts: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  comments: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  tips: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  payments: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  processed: {
    type: Boolean,
    optional: true,
  },
}));

// all BSOCIAL inserts should be processed for stats
// signing has been verified
BSOCIAL.after('insert', async (doc) => {
  // process likes, comments, reposts etc.
  // update stats on context tx
  await bSocialAfterInsert(doc);

  await BSOCIAL.updateOne({
    _id: doc._id,
  }, {
    $set: {
      processed: true,
    },
  }).catch((e) => {
    console.error('Failed updating BSocial processed', e.reason || e.message);
  });
});
