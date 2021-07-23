"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.indexBSocialTransactions=exports.processBlockEvents=exports.isBSocialOp=exports.parseBSocialTransaction=exports.processBSocialTransaction=exports.getBAPIdByAddress=exports.addErrorTransaction=exports.getLastBlockIndex=exports.updateLastBlock=exports.getBitsocketQuery=exports.FIRST_BSOCIAL_BLOCK=void 0;var _defineProperty2=_interopRequireDefault(require("@babel/runtime/helpers/defineProperty")),_asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator")),_bmapjs=_interopRequireDefault(require("bmapjs"));require("node-fetch");var _utils=require("bmapjs/dist/utils"),_config=require("./config"),_bsocial=require("./schemas/bsocial"),_errors=require("./schemas/errors"),_get=require("./get"),_status=require("./status"),_utils2=require("./lib/utils"),_db=require("./lib/db");function ownKeys(a,b){var c=Object.keys(a);if(Object.getOwnPropertySymbols){var d=Object.getOwnPropertySymbols(a);b&&(d=d.filter(function(b){return Object.getOwnPropertyDescriptor(a,b).enumerable})),c.push.apply(c,d)}return c}function _objectSpread(a){for(var b,c=1;c<arguments.length;c++)b=null==arguments[c]?{}:arguments[c],c%2?ownKeys(Object(b),!0).forEach(function(c){(0,_defineProperty2.default)(a,c,b[c])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(b)):ownKeys(Object(b)).forEach(function(c){Object.defineProperty(a,c,Object.getOwnPropertyDescriptor(b,c))});return a}var FIRST_BSOCIAL_BLOCK=671145;exports.FIRST_BSOCIAL_BLOCK=671145;var getBitsocketQuery=function(){var a=!!(0<arguments.length&&void 0!==arguments[0])&&arguments[0],b=!!(1<arguments.length&&void 0!==arguments[1])&&arguments[1];b=b||{$and:[{"out.tape.cell.s":_config.MAP_BITCOM_ADDRESS},{"out.tape.cell.s":{$in:["post","like","follow","unfollow","attachment","tip","payment","comment"]}}]};var c={q:{find:b,sort:{"blk.i":1},project:{blk:1,"tx.h":1,out:1,in:1}}};return a&&(c.q.find["blk.i"]={$gt:a}),c};exports.getBitsocketQuery=getBitsocketQuery;var updateLastBlock=function(){var a=(0,_asyncToGenerator2.default)(function*(a){return(0,_status.updateStatusValue)("lastBSocialBlock",""+a)});return function(){return a.apply(this,arguments)}}();exports.updateLastBlock=updateLastBlock;var getLastBlockIndex=function(){var a=(0,_asyncToGenerator2.default)(function*(){var a=yield(0,_status.getStatusValue)("lastBSocialBlock");return a?+a:FIRST_BSOCIAL_BLOCK});return function(){return a.apply(this,arguments)}}();exports.getLastBlockIndex=getLastBlockIndex;var addErrorTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){return delete a._id,_errors.Errors.updateOne({_id:a.txId},{$set:a},{upsert:!0})});return function(){return a.apply(this,arguments)}}();exports.addErrorTransaction=addErrorTransaction;var bapDB,getBAPIdByAddress=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b,c){if(_config.bapApiUrl)if(_config.bapApiUrl.match("mongodb://")){bapDB||(bapDB=yield(0,_db.getDB)(_config.bapApiUrl));var f=yield bapDB.collection("id").findOne({"addresses.address":a});if(f)return{idKey:f._id,valid:!0}}else{var d=yield fetch("".concat(_config.bapApiUrl,"/identity/validByAddress"),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({address:a,block:b,timestamp:c})}),e=yield d.json();if(e&&"OK"===e.status&&e.result)return e.result}return!1});return function(){return a.apply(this,arguments)}}();exports.getBAPIdByAddress=getBAPIdByAddress;var processBSocialTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){var b,c,d,e,f;if(a){var g=_objectSpread({_id:a.txId},a);if(delete g.txId,g.processed=!1,g.AIP)for(var t=0;t<g.AIP.length;t++){var{address:h}=g.AIP[t],j=yield getBAPIdByAddress(h,a.block,a.timestamp);j&&!0===j.valid&&(g.AIP[t].bapId=j.idKey)}var k="tx"===(null===(b=g.MAP[0])||void 0===b?void 0:b.context)&&(null===(c=g.MAP[0])||void 0===c?void 0:c.tx),l="twetch"===(null===(d=g.MAP[0])||void 0===d?void 0:d.app),m=l&&(null===(e=g.MAP[0])||void 0===e?void 0:e.reply)&&"null"!==(null===(f=g.MAP[0])||void 0===f?void 0:f.reply);if(m&&!k&&(g.MAP[0].context="tx",g.MAP[0].tx=g.MAP[0].reply),g.B){for(var n,o,p=0;p<g.B.length;p++)try{g.B[p]["content-type"].match(/ecies$/)&&(g.B[p].content=Buffer.from(g.B[p].content,"binary").toString("hex"))}catch(a){console.error(a)}var q=/https:\/\/twetch.app\/t\/([0-9a-zA-Z]+)/i,r=l&&(null===(n=g.B[0])||void 0===n||null===(o=n.content)||void 0===o?void 0:o.match(q));if(r&&r[1]){var i=r[1];g.B[0].content=g.B[0].content.replace(q,""),g.MAP[0].type="repost",g.MAP[0].context="tx",g.MAP[0].tx=i}}var s=yield _bsocial.BSOCIAL.findOne({_id:g._id});if(s){var u=g._id;delete g._id,s.timestamp&&delete g.timestamp,yield _bsocial.BSOCIAL.updateOne({_id:u},{$set:g}).catch(a=>{console.error(a)})}else yield _bsocial.BSOCIAL.insert(g).catch(a=>{console.error("Failed inserting bsocial tx ",g._id,a.reason||a.message)})}});return function(){return a.apply(this,arguments)}}();exports.processBSocialTransaction=processBSocialTransaction;var parseBSocialTransaction=function(){var a=(0,_asyncToGenerator2.default)(function*(a){try{var b=new _bmapjs.default,c=[{action:"string"},{currency:"string"},{address:"string"},{apiEndpoint:"string"}],d=_utils.bmapQuerySchemaHandler.bind(b,"BPP",c);b.addProtocolHandler({name:"BPP",address:"BPP",querySchema:c,handler:d});var e=(0,_utils2.cleanDocumentKeys)(yield b.transformTx(a));e.txId=e.tx.h,delete e.in,delete e.out,delete e.tx,delete e.lock,delete e.blk;return["B","AIP","MAP","BPP"].forEach(a=>{e[a]&&!Array.isArray(e[a])&&(e[a]=[e[a]])}),e}catch(b){return _config.DEBUG&&console.error(b.message,JSON.stringify(a)),!1}});return function(){return a.apply(this,arguments)}}();exports.parseBSocialTransaction=parseBSocialTransaction;var isBSocialOp=function(a){return!!(a.MAP&&0<a.MAP.length)&&!!a.MAP.find(a=>"SET"===a.cmd&&a.app&&["post","like","follow","unfollow","attachment","tip","payment"].includes(a.type))};exports.isBSocialOp=isBSocialOp;var blockIndex,processBlockEvents=function(){var a=(0,_asyncToGenerator2.default)(function*(a){try{var b=a.tx.h,c=a.blk&&a.blk.i,d=a.blk&&a.blk.t||Math.round(+new Date/1e3),e=yield parseBSocialTransaction(a);isBSocialOp(e)?(console.log("got bSocial transaction",b,c||"mempool"),e._id=b,e.block=c,e.timestamp=d,yield processBSocialTransaction(e),e.block&&e.block!==blockIndex&&(console.log("UPDATE BLOCK",e.block,typeof e.block),yield updateLastBlock(blockIndex),blockIndex=e.block)):(a.txId=b,a.block=c,yield addErrorTransaction(a))}catch(b){a.error=JSON.stringify(b,Object.getOwnPropertyNames(b)),yield addErrorTransaction(a)}});return function(){return a.apply(this,arguments)}}();exports.processBlockEvents=processBlockEvents;var indexBSocialTransactions=function(){var a=(0,_asyncToGenerator2.default)(function*(a){var b=yield getLastBlockIndex();blockIndex=b;var c=getBitsocketQuery(b,a);return yield(0,_get.getBitbusStreamingEvents)(c,b,function(){var a=(0,_asyncToGenerator2.default)(function*(a){yield processBlockEvents(a)});return function(){return a.apply(this,arguments)}}()),!0});return function(){return a.apply(this,arguments)}}();exports.indexBSocialTransactions=indexBSocialTransactions;