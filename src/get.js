import 'node-fetch';
import es from 'event-stream';
import { TOKEN } from './config';

export const getBitbusBlockEvents = async function (query, parser = 'bob') {
  parser = parser === 'txo' ? 'txo' : 'bob';
  const response = await fetch(`https://${parser}.bitbus.network/block`, {
    method: 'post',
    headers: {
      'Content-type': 'application/json; charset=utf-8',
      token: TOKEN,
      format: 'json',
    },
    body: JSON.stringify(query),
  });

  return response.json();
};

export const getBitbusStreamingEvents = (query, height, processCallback) => {
  return new Promise((resolve, reject) => {
    // Create a timestamped query by applying the "$gt" (greater than) operator with the height
    query.q.find['blk.i'] = { $gt: height };
    fetch('https://bob.bitbus.network/block', {
      method: 'post',
      headers: {
        'Content-type': 'application/json; charset=utf-8',
        'token': TOKEN,
      },
      body: JSON.stringify(query),
    })
      .then(async function(res) {
        // The promise is resolved when the stream ends.
        res.body.on('end', function() {
          resolve();
        })
          // Split NDJSON into an array stream
          .pipe(es.split())
          // Apply the logic for each line
          .pipe(es.mapSync(async function(t) {
            // process one by one
            res.body.pause();
            if (t) {
              let j = JSON.parse(t);
              await processCallback(j);
            }
            res.body.resume();
          }));
      });
  });
};
