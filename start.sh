#/bin/sh

npm run-script build && node dist/index.js ${@:1}
