import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const TIPS = new Collection('bsocial-tips', new SimpleSchema({
  txId: {
    type: String,
  },
  idKey: {
    type: String,
  },
  tx: {
    type: String,
  },
  t: {
    type: SimpleSchema.Integer,
  },
  c: {
    type: String,
  },
  a: {
    type: Number,
  },
}));
