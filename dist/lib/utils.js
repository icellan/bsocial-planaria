"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.cleanDocumentKeys=void 0;var cleanDocumentKeys=function(a){return"object"==typeof a?Array.isArray(a)?a.map(cleanDocumentKeys):Object.keys(a).reduce((b,c)=>{var d=a[c];return b[c.replace(/[\.\$]/g,"-")]="object"==typeof d?cleanDocumentKeys(d):d,b},{}):a};exports.cleanDocumentKeys=cleanDocumentKeys;