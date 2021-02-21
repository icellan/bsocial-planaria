"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.indexBSocialTransactionsStream=exports.indexBSocialTransactions=exports.processBlockEvents=exports.parseBSocialTransaction=exports.processBSocialTransaction=exports.addErrorTransaction=exports.getLastBlockIndex=exports.updateLastBlock=exports.getBitsocketQuery=exports.FIRST_BSOCIAL_BLOCK=void 0;var _defineProperty2=_interopRequireDefault(require("@babel/runtime/helpers/defineProperty")),_asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator")),_eventStream=_interopRequireDefault(require("event-stream")),_bmapjs=_interopRequireDefault(require("bmapjs"));require("node-fetch");var _utils=require("bmapjs/dist/utils"),_config=require("./config"),_bsocial=require("./schemas/bsocial"),_errors=require("./schemas/errors"),_get=require("./get"),_status=require("./status"),_utils2=require("./lib/utils");function ownKeys(a,b){var c=Object.keys(a);if(Object.getOwnPropertySymbols){var d=Object.getOwnPropertySymbols(a);b&&(d=d.filter(function(b){return Object.getOwnPropertyDescriptor(a,b).enumerable})),c.push.apply(c,d)}return c}function _objectSpread(a){for(var b,c=1;c<arguments.length;c++)b=null==arguments[c]?{}:arguments[c],c%2?ownKeys(Object(b),!0).forEach(function(c){(0,_defineProperty2.default)(a,c,b[c])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(b)):ownKeys(Object(b)).forEach(function(c){Object.defineProperty(a,c,Object.getOwnPropertyDescriptor(b,c))});return a}var FIRST_BSOCIAL_BLOCK=671145;exports.FIRST_BSOCIAL_BLOCK=671145;var getBitsocketQuery=function(){var a=!!(0<arguments.length&&void 0!==arguments[0])&&arguments[0],b=!!(1<arguments.length&&void 0!==arguments[1])&&arguments[1];b=b||{$and:[{"out.tape.cell":{$elemMatch:{i:0,s:_config.MAP_BITCOM_ADDRESS}}},{"out.tape.cell":{$elemMatch:{i:1,s:"SET"}}},{"out.tape.cell":{$elemMatch:{i:2,s:"app"}}},{"out.tape.cell":{$elemMatch:{i:4,s:"type"}}},{"out.tape.cell":{$elemMatch:{i:5,s:{$in:["post","like","follow","unfollow","attachment","tip","payment"]}}}}]};var c={q:{find:b,sort:{"blk.i":1},project:{blk:1,"tx.h":1,out:1,in:1}}};return a&&(c.q.find["blk.i"]={$gt:a}),c};exports.getBitsocketQuery=getBitsocketQuery;var updateLastBlock=function(){var a=(0,_asyncToGenerator2.default)(function*(a){return(0,_status.updateStatusValue)("lastBSocialBlock",a)});return function(){return a.apply(this,arguments)}}();exports.updateLastBlock=updateLastBlock;var getLastBlockIndex=function(){var a=(0,_asyncToGenerator2.default)(function*(){var a=yield(0,_status.getStatusValue)("lastBSocialBlock");return a?+a:FIRST_BSOCIAL_BLOCK});return function(){return a.apply(this,arguments)}}();exports.getLastBlockIndex=getLastBlockIndex;var addErrorTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){return delete a._id,_errors.Errors.updateOne({_id:a.txId},{$set:a},{upsert:!0})});return function(){return a.apply(this,arguments)}}();exports.addErrorTransaction=addErrorTransaction;var getBAPIdByAddress=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b,c){if(_config.bapApiUrl){var d=yield fetch("".concat(_config.bapApiUrl,"/identity/validByAddress"),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({address:a,block:b,timestamp:c})}),e=yield d.json();if(e&&"OK"===e.status&&e.result)return e.result}return!1});return function(){return a.apply(this,arguments)}}(),processBSocialTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){if(a){var b=_objectSpread({_id:a.txId},a);if(delete b.txId,b.processed=!1,b.AIP)for(var f=0;f<b.AIP.length;f++){var{address:c}=b.AIP[f],d=yield getBAPIdByAddress(c,a.block,a.timestamp);d&&!0===d.valid&&(b.AIP[f].bapId=d.idKey)}if(b.B)for(var g=0;g<b.B.length;g++)try{b.B[g]["content-type"].match(/ecies$/)&&(b.B[g].content=Buffer.from(b.B[g].content,"binary").toString("hex"))}catch(a){console.error(a)}var e=yield _bsocial.BSOCIAL.findOne({_id:b._id});if(e){var h=b._id;delete b._id,e.timestamp&&delete b.timestamp,yield _bsocial.BSOCIAL.updateOne({_id:h},{$set:b}).catch(a=>{console.error(a)})}else yield _bsocial.BSOCIAL.insert(b).catch(a=>{console.error(a)})}});return function(){return a.apply(this,arguments)}}();exports.processBSocialTransaction=processBSocialTransaction;var parseBSocialTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){try{var b=new _bmapjs.default,c=[{action:"string"},{currency:"string"},{address:"string"},{apiEndpoint:"string"}],d=_utils.bmapQuerySchemaHandler.bind(b,"BPP",c);b.addProtocolHandler({name:"BPP",address:"BPP",querySchema:c,handler:d});var e=(0,_utils2.cleanDocumentKeys)(yield b.transformTx(a));e.txId=e.tx.h,delete e.in,delete e.out,delete e.tx,delete e.lock,delete e.blk;return["B","AIP","MAP","BPP"].forEach(a=>{e[a]&&!Array.isArray(e[a])&&(e[a]=[e[a]])}),e}catch(b){return _config.DEBUG&&console.error(b.message,JSON.stringify(a)),!1}});return function(){return a.apply(this,arguments)}}();exports.parseBSocialTransaction=parseBSocialTransaction;var processBlockEvents=function(){var a=(0,_asyncToGenerator2.default)(function*(a){try{var b=a.tx.h,c=a.blk&&a.blk.i,d=a.blk&&a.blk.t||Math.round(+new Date/1e3);console.log("got bSocial transaction",b,c||"mempool");var e=yield parseBSocialTransaction(a);e?(e._id=b,e.block=c,e.timestamp=d,yield processBSocialTransaction(e),e.block&&(yield updateLastBlock(e.block))):(a.txId=b,a.block=c,yield addErrorTransaction(a))}catch(b){a.error=JSON.stringify(b,Object.getOwnPropertyNames(b)),yield addErrorTransaction(a)}});return function(){return a.apply(this,arguments)}}();exports.processBlockEvents=processBlockEvents;var indexBSocialTransactions=function(){var a=(0,_asyncToGenerator2.default)(function*(a){for(var b=yield getLastBlockIndex(),c=getBitsocketQuery(b,a),d=yield(0,_get.getBitbusBlockEvents)(c),e=0;e<d.length;e++)yield processBlockEvents(d[e]);return!0});return function(){return a.apply(this,arguments)}}();exports.indexBSocialTransactions=indexBSocialTransactions;var indexBSocialTransactionsStream=function(){var a=(0,_asyncToGenerator2.default)(function*(){var a=!!(0<arguments.length&&arguments[0]!==void 0)&&arguments[0],b=yield getLastBlockIndex();_config.DEBUG&&console.log("POST https://bob.bitbus.network/block");var c=yield fetch("https://bob.bitbus.network/block",{method:"post",headers:{"Content-type":"application/json; charset=utf-8",token:_config.TOKEN,from:FIRST_BSOCIAL_BLOCK},body:JSON.stringify(getBitsocketQuery(b,a))});return new Promise((a,b)=>{_config.DEBUG&&console.log("PROCESSING BODY"),c.body.on("sfinish",()=>{_config.DEBUG&&console.log("FINISHED BODY"),a()}),c.body.on("end",()=>{_config.DEBUG&&console.log("END BODY"),a()}),c.body.on("error",a=>{_config.DEBUG&&console.error(a),b(a)}),c.body.pipe(_eventStream.default.split(),{end:!1}).pipe(_eventStream.default.mapSync(function(){var a=(0,_asyncToGenerator2.default)(function*(a){if(a){var b=JSON.parse(a);yield processBlockEvents(b)}});return function(){return a.apply(this,arguments)}}()),{end:!1})})});return function(){return a.apply(this,arguments)}}();exports.indexBSocialTransactionsStream=indexBSocialTransactionsStream;