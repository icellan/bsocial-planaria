import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const PAYMENTS = new Collection('bsocial-payments', new SimpleSchema({
  txId: {
    type: String,
  },
  idKey: {
    type: String,
    optional: false,
  },
  address: {
    type: String,
    optional: false,
  },
  decryptionKey: {
    type: String,
    optional: false,
  },
  tx: {
    type: String,
    optional: false,
  },
  t: {
    type: SimpleSchema.Integer,
    optional: false,
  },
}));
