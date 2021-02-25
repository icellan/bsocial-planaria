"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.bSocialAfterInsert=void 0;var _defineProperty2=_interopRequireDefault(require("@babel/runtime/helpers/defineProperty")),_asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator")),_bsv=_interopRequireDefault(require("bsv")),_bsocial=require("../bsocial"),_likes=require("../likes"),_comments=require("../comments"),_reposts=require("../reposts"),_tips=require("../tips"),_payments=require("../payments"),_follows=require("../follows");function ownKeys(a,b){var c=Object.keys(a);if(Object.getOwnPropertySymbols){var d=Object.getOwnPropertySymbols(a);b&&(d=d.filter(function(b){return Object.getOwnPropertyDescriptor(a,b).enumerable})),c.push.apply(c,d)}return c}function _objectSpread(a){for(var b,c=1;c<arguments.length;c++)b=null==arguments[c]?{}:arguments[c],c%2?ownKeys(Object(b),!0).forEach(function(c){(0,_defineProperty2.default)(a,c,b[c])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(b)):ownKeys(Object(b)).forEach(function(c){Object.defineProperty(a,c,Object.getOwnPropertyDescriptor(b,c))});return a}var updateActionStats=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b,c,d){var e=!!(4<arguments.length&&arguments[4]!==void 0)&&arguments[4],{tx:f}=a,g=_bsv.default.crypto.Hash.sha256(Buffer.from("".concat(b).concat(f),"hex")).toString("hex"),h=yield c.findOne({_id:g});if(!h){var i={_id:g,idKey:b,tx:f,t:Math.round(+new Date/1e3)};e&&(i=_objectSpread(_objectSpread({},i),e)),yield c.insert(i),yield _bsocial.BSOCIAL.updateOne({_id:f},{$inc:{[d]:1}})}});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertLike=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){"like"===a.type&&"tx"===a.context&&a.tx&&(yield updateActionStats(a,b,_likes.LIKES,"likes"))});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertRepost=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){"repost"===a.type&&a.tx&&(yield updateActionStats(a,b,_reposts.REPOSTS,"reposts"))});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertComment=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){"post"===a.type&&"tx"===a.context&&a.tx&&(yield updateActionStats(a,b,_comments.COMMENTS,"comments"))});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertTip=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){"tip"===a.type&&"tx"===a.context&&a.tx&&(yield updateActionStats(a,b,_tips.TIPS,"tips"))});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertPayment=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){if("payment"===a.type&&"tx"===a.context&&a.tx&&b.BPP&&b.BPP[0]&&b.BPP[0].address){var{address:c}=b.BPP[0];yield updateActionStats(a,c,_payments.PAYMENTS,"payments",{decryptionKey:b.BPP[0].apiEndpoint})}});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertFollow=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){if("follow"===a.type&&a.idKey){var c=_bsv.default.crypto.Hash.sha256(Buffer.from("".concat(b).concat(a.idKey),"hex")).toString("hex"),d=yield _follows.FOLLOWS.findOne({_id:c});if(!d){var e={_id:c,idKey:b,follows:a.idKey,t:Math.round(+new Date/1e3)};yield _follows.FOLLOWS.insert(e)}}});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsertUnfollow=function(){var a=(0,_asyncToGenerator2.default)(function*(a,b){if("unfollow"===a.type&&a.idKey){var c=_bsv.default.crypto.Hash.sha256(Buffer.from("".concat(b).concat(a.idKey),"hex")).toString("hex"),d=yield _follows.FOLLOWS.findOne({_id:c});d&&(yield _follows.FOLLOWS.deleteOne({idKey:b,follows:a.idKey}))}});return function(){return a.apply(this,arguments)}}(),bSocialAfterInsert=function(){var a=(0,_asyncToGenerator2.default)(function*(a){if(a.AIP&&a.AIP[0]&&!0===a.AIP[0].verified){var b=a.AIP[0].bapId||Buffer.from(a.AIP[0].address).toString("hex");if(a.MAP)for(var c,d=0;d<a.MAP.length;d++)c=a.MAP[d],"like"===c.type?yield bSocialAfterInsertLike(c,b):"repost"===c.type?yield bSocialAfterInsertRepost(c,b):"post"===c.type&&"tx"===c.context?yield bSocialAfterInsertComment(c,b):"tip"===c.type&&"tx"===c.context?yield bSocialAfterInsertTip(c,b):"payment"===c.type&&"tx"===c.context?yield bSocialAfterInsertPayment(c,a):"follow"===c.type&&c.idKey?yield bSocialAfterInsertFollow(c,b):"unfollow"===c.type&&c.idKey&&(yield bSocialAfterInsertUnfollow(c,b))}});return function(){return a.apply(this,arguments)}}();exports.bSocialAfterInsert=bSocialAfterInsert;