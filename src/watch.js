import ReconnectingEventSource from './lib/reconnecting-eventsource';
import {
  getBitsocketQuery,
  indexBSocialTransactions,
  processBlockEvents,
} from './bsocial.js';

export const watchBSocialTransactions = async function (queryFind = false) {
  // Base64 encode your bitquery
  const query = getBitsocketQuery(false, queryFind);
  const b64 = Buffer.from(JSON.stringify(query)).toString('base64');

  // Subscribe
  const url = `https://bob.bitsocket.network/s/${b64}`;
  console.log('starting socket listener on', url);
  const sock = new ReconnectingEventSource(url);
  sock.onmessage = async function (e) {
    const events = JSON.parse(e.data).data;
    if (events && events.length > 0) {
      events.forEach((event) => {
        processBlockEvents(event);
      });
    }
  };

  // get mined blocks
  await indexBSocialTransactions();
  setInterval(async () => {
    await indexBSocialTransactions();
  }, 5 * 60 * 1000); // run every 5 minutes to get new blocks
};
