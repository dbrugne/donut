'use strict';
var _ = require('underscore');

var allowedFields = [
  'path',
  'public_id',
  'version',
  'filename',
  'size',
  'type' // 'image', 'raw'
];

/**
 * Check for user/room:message object validity. Output an array with objects
 * with only allowed keys
 *
 * @param value
 */
module.exports.filter = function (files) {
  if (!files || !files.length) {
    return null;
  }

  var filtered = [];
  _.each(files, function (i) {
    var _i = {};
    _.each(allowedFields, function (key) {
      if (i[key]) {
        _i[key] = i[key];
      }
    });
    filtered.push(_i);
  });
  return filtered;
};
