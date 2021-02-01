import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const REPOSTS = new Collection('bsocial-reposts', new SimpleSchema({
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
