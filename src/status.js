import { Status } from './schemas/status';

export const updateStatusValue = async function (id, value) {
  return Status.updateOne({
    _id: id,
  }, {
    $set: {
      value,
    },
  }, {
    upsert: true,
  });
};

export const getStatusValue = async function (id) {
  const currentStatus = await Status.findOne({ _id: id });
  return (currentStatus || {}).value;
};
