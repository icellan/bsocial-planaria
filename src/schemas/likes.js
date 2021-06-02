import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const LIKES = new Collection('bsocial-likes', new SimpleSchema({
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
}));
