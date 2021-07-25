import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const BSOCIAL_BITFS = new Collection('bsocial-bitfs', new SimpleSchema({
  content: {
    type: String,
  },
  'content-type': {
    type: String,
  },
  length: {
    type: SimpleSchema.Integer,
  },
  tx: {
    type: String,
  },
}));
