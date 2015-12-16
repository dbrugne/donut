'use strict';
var async = require('async');
var _ = require('underscore');

/**
 * Generate onetoone welcome object
 * @param app
 * @param user {UserModel}
 * @param users [{UserModel}]
 * @param fn
 */
module.exports = function (app, user, users, fn) {
  var single = false;
  if (!_.isArray(users)) {
    users = [users];
    single = true;
  }

  // robustness code, when a .ones points on a deleted user
  users = _.filter(users, function (u) {
    return (u && u.user && u.user.id);
  });

  async.waterfall([

    function status (callback) {
      app.statusService.getStatusByUids(_.map(users, function (user) {
        return user.user.id;
      }), callback);
    },

    function prepare (statuses, callback) {
      var data = [];
      _.each(users, function (obj, index, list) {
        var u = obj.user;

        if (!u.username) {
          return;
        }

        var one = {
          user_id: u.id,
          confirmed: u.confirmed,
          realname: u.realname,
          username: u.username,
          avatar: u._avatar(),
          poster: u._poster(),
          color: u.color,
          location: u.location,
          website: u.website,
          banned: user.isBanned(u.id), // for ban/deban menu
          i_am_banned: u.isBanned(user.id), // for input enable/disable
          unviewed: user.hasUnviewedOneMessage(u),
          lastactivity_at: obj.lastactivity_at
        };

        if (statuses[u.id] === true) {
          one.status = 'online';
          one.onlined = u.lastonline_at;
        } else {
          one.status = 'offline';
          one.onlined = u.lastoffline_at;
        }
        data.push(one);
      });

      // user.onetoones is empty or contains only removed users ids
      if (!data.length) {
        return callback(null, null);
      }

      if (single) {
        return callback(null, data[0]);
      } else {
        return callback(null, data);
      }
    }

  ], fn);
};
