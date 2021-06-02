import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const COMMENTS = new Collection('bsocial-comments', new SimpleSchema({
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
