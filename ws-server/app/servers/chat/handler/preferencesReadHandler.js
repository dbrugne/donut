'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var id = data.room_id || null;

  var event = {};

  async.waterfall([

    function prepare (callback) {
      var preferences = {};
      _.each(User.preferencesKeys(), function (config, key) {
        // skip non-needed key for this request
        if ((id && key.indexOf('room:') !== 0) || (!id && key.indexOf('room:') === 0)) {
          return;
        }

        // key to lookup
        var _key = (id) ? key.replace('__what__', id) : key;

        // current (or default) value
        var _value = user.preferencesValue(_key);

        preferences[_key] = _value;
      });

      event.preferences = preferences;
      return callback(null);
    },

    function bannedUsers (callback) {
      event.bannedUsers = _.map(user.bans, function (b) {
        return {
          user_id: b.user.id,
          avatar: b.user._avatar(),
          username: b.user.username
        };
      });
      return callback(null);
    }

  ], function (err) {
    if (err) {
      logger.error('[preferences:read] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, event);
  });

};
