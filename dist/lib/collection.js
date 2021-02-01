"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.Collection=void 0;var _asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator")),_db=require("./db");class Collection{constructor(a){var b=!!(1<arguments.length&&arguments[1]!==void 0)&&arguments[1];this.collectionName=a,this.schema=b,b&&this.schema.extend({_id:{type:String}}),this._before={},this._after={}}find(){var a=arguments,b=this;return(0,_asyncToGenerator2.default)(function*(){var c=0<a.length&&void 0!==a[0]?a[0]:{},d=1<a.length&&void 0!==a[1]?a[1]:{};b.db||(b.db=yield(0,_db.getDB)()),yield b._runBeforeHook("find",c,d);var e=yield b.db.collection(b.collectionName).find(c,d);return yield b._runAfterHook("find",e),e})()}findOne(){var a=arguments,b=this;return(0,_asyncToGenerator2.default)(function*(){var c=0<a.length&&void 0!==a[0]?a[0]:{},d=1<a.length&&void 0!==a[1]?a[1]:{};b.db||(b.db=yield(0,_db.getDB)()),yield b._runBeforeHook("findOne",c,d);var e=yield b.db.collection(b.collectionName).findOne(c);return yield b._runAfterHook("findOne",e),e})()}updateOne(a,b){var c=arguments,d=this;return(0,_asyncToGenerator2.default)(function*(){var e=2<c.length&&c[2]!==void 0?c[2]:{};d.db||(d.db=yield(0,_db.getDB)());var f=d._getCleanModifier(b);if(d._hasHook("updateOne")){var i=yield d.findOne(a).catch(a=>{console.error(a)});yield d._runBeforeHook("updateOne",i,b,e);var g=yield d.db.collection(d.collectionName).updateOne(i?{_id:i._id}:a,f,e),h=i?i._id:g.upsertedId?g.upsertedId._id:null;if(d._hasAfterHook("updateOne")){var j=yield d.findOne({_id:h});yield d._runAfterHook("updateOne",j,b,e)}return g}return d.db.collection(d.collectionName).updateOne(a,f,e)})()}updateMany(a,b){var c=arguments,d=this;return(0,_asyncToGenerator2.default)(function*(){var e=2<c.length&&void 0!==c[2]?c[2]:{};d.db||(d.db=yield(0,_db.getDB)()),yield d._runBeforeHook("updateMany",a,b,e);var f=d._getCleanModifier(b),g=yield d.db.collection(d.collectionName).updateMany(a,f,e);return yield d._runAfterHook("updateMany",a,b,e),g})()}update(a,b){var c=arguments,d=this;return(0,_asyncToGenerator2.default)(function*(){var e=2<c.length&&c[2]!==void 0?c[2]:{};return d.updateMany(a,b,e)})()}insert(a){var b=arguments,c=this;return(0,_asyncToGenerator2.default)(function*(){var d=1<b.length&&void 0!==b[1]?b[1]:{};c.db||(c.db=yield(0,_db.getDB)()),yield c._runBeforeHook("insert",a,d);var e=c._getCleanDoc(a);e.hasOwnProperty("_id")||(e._id=Random.id());var f=yield c.db.collection(c.collectionName).insertOne(e,d);return yield c._runAfterHook("insert",e,d),f})()}deleteOne(a,b){var c=this;return(0,_asyncToGenerator2.default)(function*(){c.db||(c.db=yield(0,_db.getDB)()),yield c._runBeforeHook("deleteOne",a,b);var d=yield c.db.collection(c.collectionName).deleteOne(a,b);return yield c._runAfterHook("deleteOne",a,b),d})()}deleteMany(a,b){var c=this;return(0,_asyncToGenerator2.default)(function*(){c.db||(c.db=yield(0,_db.getDB)()),yield c._runBeforeHook("deleteMany",a,b);var d=yield c.db.collection(c.collectionName).deleteMany(a,b);return yield c._runAfterHook("deleteMany",a,b),d})()}before(a,b){this._before[a]||(this._before[a]=[]),this._before[a].push(b)}after(a,b){this._after[a]||(this._after[a]=[]),this._after[a].push(b)}_runBeforeHook(a,b,c,d){var e=this;return(0,_asyncToGenerator2.default)(function*(){if(e._hasBeforeHook(a))for(var f,g=0;g<e._before[a].length;g++)f=e._before[a][g],yield f.call(e,b,c,d)})()}_runAfterHook(a,b,c,d){var e=this;return(0,_asyncToGenerator2.default)(function*(){if(e._hasAfterHook(a))for(var f,g=0;g<e._after[a].length;g++)f=e._after[a][g],yield f.call(e,b,c,d)})()}_hasHook(a){return this._before.hasOwnProperty(a)||this._after.hasOwnProperty(a)}_hasBeforeHook(a){return this._before.hasOwnProperty(a)}_hasAfterHook(a){return this._after.hasOwnProperty(a)}_getCleanModifier(a){var b=a;if(this.schema){b=this.schema.clean(a);var c=this.schema.newContext();if(c.validate(b,{modifier:!0}),!c.isValid())throw new Error(c.validationErrors())}return b}_getCleanDoc(a){var b=a;return this.schema&&(b=this.schema.clean(a)),b}}exports.Collection=Collection;