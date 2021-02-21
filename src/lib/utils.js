export const cleanDocumentKeys = function (input) {
  if (typeof input !== 'object') return input;

  if (Array.isArray(input)) return input.map(cleanDocumentKeys);
  return Object.keys(input).reduce((newObj, key) => {
    const val = input[key];
    newObj[key.replace(/[\.\$]/g, '-')] = (typeof val === 'object') ? cleanDocumentKeys(val) : val;
    return newObj;
  }, {});
};
