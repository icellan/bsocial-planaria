import connect from 'mongodb';
import { dbName, mongoUrl } from '../config';

let db = null;

/**
 * Database singleton
 *
 * @returns {Promise<null|Db>}
 */
export const getDB = async function (mongodbConnectionUrl = false) {
  if (!db) {
    const client = new connect.MongoClient(mongodbConnectionUrl || mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      keepAlive: 1,
    });

    await client.connect()
      .catch((err) => {
        console.log(err);
        process.exit(-1);
      });

    db = client.db(dbName);
  }

  return db;
};
