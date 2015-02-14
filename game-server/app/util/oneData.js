var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../shared/models/user');

/**
 * Helper to retrieve/prepare all the ones data needed for 'welcome' and
 * 'user:welcome'
 */
module.exports = function(app, uid, username, opts, fn) {
  opts = _.extend({
  }, opts);

  async.waterfall([

    function findUser(callback) {
      var q = User.findByUsername(username)
        .exec(function(err, user) {
        if (err)
          return callback('Error while retrieving user: '+err);

        if (!user) {
          logger.info('Unable to find this one to one user, we skip: '+username);
          return fn(null, null);
        }

        return callback(null, user);
      });
    },

    function status(user, callback) {
      app.statusService.getStatusByUid(user._id.toString(), function(err, liveStatus) {
        if (err)
          return callback('Error while retrieving user '+user._id.toString()+' status: '+err);

        return callback(null, user, liveStatus);
      });
    },

    function prepare(user, liveStatus, callback) {
      var status = (liveStatus)
        ? 'online'
        : 'offline';
      var onlined = (liveStatus)
        ? user.lastonline_at
        : user.lastoffline_at;
      var oneData = {
        user_id   : user._id.toString(),
        username  : user.username,
        avatar    : user._avatar(),
        poster    : user._poster(),
        color     : user.color,
        location  : user.location,
        website   : user.website,
        onlined   : onlined,
        status    : status
      };

      return callback(null, oneData);
    }

  ], function(err, oneData) {
    if (err)
      return fn(err);

    return fn(null, oneData);
  });

};