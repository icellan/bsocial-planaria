import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const FOLLOWS = new Collection('bsocial-follows', new SimpleSchema({
  idKey: {
    type: String,
  },
  follows: {
    type: String,
  },
  t: {
    type: SimpleSchema.Integer,
  },
}));
