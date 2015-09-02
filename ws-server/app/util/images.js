'use strict';
var debug = require('debug')('donut:server:images');
var _ = require('underscore');

var allowedFields = [
  'path',
  'public_id',
  'version'
];

/**
 * Check for user/room:message object validity. Output an array with objects
 * with only allowed keys
 *
 * @param value
 */
module.exports.filter = function (images) {
  if (!images || !images.length)
    return null;

  var filtered = [];
  _.each(images, function (i) {
    var _i = {};
    _.each(allowedFields, function (key) {
      if (i[key])
        _i[key] = i[key];
    });
    filtered.push(_i);
  });
  return filtered;
};
