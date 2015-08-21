var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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

handler.read = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  var name = data.name || null; // @todo : should be replaced with Room._id??

  var event = {};

  async.waterfall([

    function prepare(callback) {
      var preferences = {};
      _.each(User.preferencesKeys(), function (config, key) {
        // skip non-needed key for this request
        if ((name && key.indexOf('room:') !== 0) || (!name && key.indexOf('room:') === 0))
          return;

        // key to lookup
        var _key = (name) ? key.replace('__what__', name) : key;

        // current (or default) value
        var _value = user.preferencesValue(_key);

        preferences[_key] = _value;
      });

      event.preferences = preferences;
      return callback(null);
    },

    function bannedUsers(callback) {
      event.bannedUsers = _.map(user.bans, function (u) {
        return {
          user_id: u.id,
          avatar: u._avatar(),
          username: u.username
        };
      });
      return callback(null);
    }

  ], function (err) {
    if (err) {
      logger.error('[preferences:read] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};