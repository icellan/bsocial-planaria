import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const TIPS = new Collection('bsocial-tips', new SimpleSchema({
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
