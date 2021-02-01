# bsocial-planaria
> Bitcoin Social (BitcoinSchema) transaction indexer

bSocial-planaria is a [Bitbus](https://docs.bitbus.network/) compatible Bitcoin Social indexer. It scans all MAP compatible transactions and processes them into a global bSocial state using the bitsocket.network servers.

There are other ways to index bSocial transaction, for instance with [bmap-planaria](https://github.com/rohenaz/bmap-planaria). The difference is that bSocial is optimized for the bitcoin social networking features and is less generic than bmap-planaria.

**NOTE:** This is still work in progress and should be considered beta software. Issues / requests and PR's are welcome.

# global installation

```shell
npm install -g bsocial-planaria
```

Set the environment variables. You must at least set the planaria token.

```shell
export BSOCIAL_PLANARIA_TOKEN=""
```

The token is a Planaria Token that can be created here: https://token.planaria.network/

And optionally overwrite the defaults for the database:

```shell
export BSOCIAL_MONGO_URL="mongodb://localhost:27017/bsocial-planaria"
```

Indexing bSocial blocks can now be done by running

```shell
bsocial-planaria
```

If you want to run continuously and also listen to the mempool, run:

```shell
bsocial-planaria -a watch
```

It's also possible to get transactions directly from bitbus with the bsocial-planaria cli

```shell
bsocial-planaria -a get -t <txId>
```

Or run a query for at most 10 transactions

```shell
bsocial-planaria -a get -q '{"out.tape.cell":"MAP SET app type"}' -p bob
```

The arguments to the bsocial-planaria cli are:

| arg             | Description                                                                                            |
| --------------- |------------------------------------------------------------------------------------------------------- |
| `-a <action>`   | Action to call (`index` (default), `watch`, `get`)                                                     |
| `-t <txId>`     | Transaction Id to search for. Only works together with `-a get`                                        |
| `-q <query>`    | JSON stringified query. Only works together with `-a get`                                              |
| `-p <parser>`   | Parser to use for the returned transaction (`txo` (default), `bob`). Only works together with `-a get` |

# local installation

```
git clone https://github.com/icellan/bsocial-planaria.git
```

bsocial-planaria can run either with settings from a config file (`config.json`) or from environment variables.

config.json
```json
{
  "token": "ey...",
  "mongoUrl": "mongodb://..."
}
```

environment
```shell
export BSOCIAL_PLANARIA_TOKEN="ey..."
export BSOCIAL_MONGO_URL="mongo://..."
```

## run

To run the indexer once to index all blocks:

```shell
./start.sh
```

To run the indexer in watch mode, which also indexes all transactions in the mempool:

```shell
./watch.sh
```

## testing

```shell
npm run test
```
or

```shell
npm run testwatch
```

# Including in your own package or site

```
npm install bsocial-planaria
```

Make sure you set the environment variables before running any scripts:

```shell
export BSOCIAL_PLANARIA_TOKEN = '<planaria token>';
export BSOCIAL_MONGO_URL = 'mongodb://localhost:27017/bsocial-planaria';
```

Index all mined bSocial transactions:

```javascript
import { indexBSocialTransactions } from 'bsocial-planaria/src';

(async function() {
  await indexBSocialTransactions();
})();
```

or, index all mined transactions + listen to the mempool:

```javascript
import { watchBSocialTransactions } from 'bsocial-planaria/src/watch';

(async function() {
  await watchBSocialTransactions();
})();
```

You can also pass a custom query to the bSocial scripts, overriding the default query that searches for transactions.

```javascript
import { watchBSocialTransactions } from 'bsocial-planaria/src/watch';

(async function() {
  // this will only watch for new ID transactions
  await watchBSocialTransactions({
    'out.s2': 'MAP',
    'out.s3': 'SET',
    'out.s4': 'app'
  });
})();
```

# Babel

Make sure babel is set up properly or that es6 is supported by your own package.
