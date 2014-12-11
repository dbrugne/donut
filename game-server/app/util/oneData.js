var logger = require('pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../shared/models/user');
var retriever = require('../../../shared/models/historyone').retrieve();

/**
 * Helper to retrieve/prepare all the one to one data needed for 'welcome' and
 * 'user:welcome' events:
 *   [- user entity]
 *   - history
 */
module.exports = function(app, uid, username, fn) {

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

    function history(user, liveStatus, callback) {
      // get last n events
      retriever(uid, user._id.toString(), null, function(err, history) { // MongoDB .update({$addToSet}) seems to work only with String, toString() is important!
        if (err)
          return callback(err);

        return callback(null, user, liveStatus, history);
      });
    },

    function prepare(user, liveStatus, history, callback) {
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
        poster    : user.poster,
        color     : user.color,
        location  : user.location,
        website   : user.website,
        onlined   : onlined,
        status    : status,
        history   : history
      };

      return callback(null, oneData);
    }

  ], function(err, oneData) {
    if (err)
      return fn(err);

    return fn(null, oneData);
  });

};