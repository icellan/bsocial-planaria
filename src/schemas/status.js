import SimpleSchema from 'simpl-schema';
import { Collection } from '../lib/collection';

export const Status = new Collection('_status', new SimpleSchema({
  value: {
    type: String,
    label: 'Value for the status item in _id',
    optional: false,
  },
}));
