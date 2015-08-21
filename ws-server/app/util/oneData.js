var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var HistoryOne = require('../../../shared/models/historyone');

/**
 * Generate onetoone welcome object
 * @param app
 * @param user {UserModel}
 * @param users [{UserModel}]
 * @param fn
 */
module.exports = function(app, user, users, fn) {
  var single = false;
  if (!_.isArray(users)) {
    users = [users];
    single = true;
  }

  var that = this;

  async.waterfall([

    function status(callback) {
      app.statusService.getStatusByUids(_.map(users, 'id'), callback);
    },

    function prepare(statuses, callback) {

      var data = [];
      _.each(users, function(u, index, list) {
        if (!u.username)
          return;

        HistoryOne.findUnread(u.id, function(err, doc) {
          if (err)
            return callback(err, null);

          that.unread = (doc)
          ? true
          : false;
        });

        var one = {
          user_id     : u.id,
          username    : u.username,
          avatar      : u._avatar(),
          poster      : u._poster(),
          color       : u.color,
          location    : u.location,
          website     : u.website,
          banned      : user.isBanned(u.id), // for ban/deban menu
          i_am_banned : u.isBanned(user.id), // for input enable/disable
          unread      : that.unread
        };

        if (statuses[u.id] === true) {
          one.status = 'online';
          one.onlined = user.lastonline_at;
        } else {
          one.status = 'offline';
          one.onlined = user.lastoffline_at;
        }
        data.push(one);
      });

      // user.onetoones is empty or contains only removed users ids
      if (!data.length)
        return callback(null, null);

      if (single)
        return callback(null, data[0]);
      else
        return callback(null, data);
    }

  ], fn);

};