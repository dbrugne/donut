'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:input');
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../shared/models/room');
var UserModel = require('../../../shared/models/user');
var common = require('@dbrugne/donut-common');

/**
 * Check for maximal length, sanitize line breaks
 * Return filtered string or empty string if too long or empty.
 * @param value
 * @param max
 * @return false || filtered String
 */
module.exports.filter = function (value, maxLength) {
  // @todo : add without smileys code count

  if (!value)
    return false;

  // check length
  maxLength = maxLength || 512;
  if (value.length < 1 || value.length > maxLength)
    return false;

  var filtered = value.replace(/(\r\n|\r)/g, '\n'); // only *nix line-breaks

  // only whitespace
  if (filtered.trim() == '')
    return false;

  if (filtered == '')
    return false;

  return filtered;
};

/**
 * Find and replace markupable elements in given string
 * @param string
 * @param callback Function(err, String, {markups})
 */
module.exports.mentions = function (string, callback) {
  if (!string || string === '')
    return callback(null, string, {});

  common.markupString(string, function (markups, fn) {
    if (!markups.rooms.length && !markups.users.length)
      return fn(null, markups);

    async.parallel([

      function (cb) {
        if (!markups.rooms.length)
          return cb(null);

        var _rooms = _.uniq(_.map(markups.rooms, function (r) {
          return '#' + r.name;
        }));
        RoomModel.listByName(_rooms).exec(cb);
      },

      function (cb) {
        if (!markups.users.length)
          return cb(null);

        var _users = _.uniq(_.map(markups.users, function (u) {
          return u.username;
        }));
        UserModel.listByUsername(_users).exec(cb);
      }

    ], function (err, results) {
      if (err)
        return fn(err);

      _.each(markups.rooms, function (markup, index) {
        var model = _.find(results[0], function (m) {
          return ('#' + markup.name.toLocaleLowerCase() === m.name.toLocaleLowerCase());
        });
        if (!model)
          return;
        markups.rooms[index].id = model.id;
      });
      _.each(markups.users, function (markup, index) {
        var model = _.find(results[1], function (m) {
          return (markup.username.toLocaleLowerCase() === m.username.toLocaleLowerCase());
        });
        if (!model)
          return;
        markups.users[index].id = model.id;
      });

      return fn(null, markups);
    });
  }, callback);
};
