'use strict';
var errors = require('../../../util/errors');
var async = require('async');
//var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var opedUser = session.__user__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!group.isOwner(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (!opedUser) {
        return callback('user-not-found');
      }

      if (!group.isIn(opedUser.id)) {
        return callback('not-in');
      }

      if (group.isOwner(opedUser.id)) {
        return callback('owner');
      }

      if (group.isOp(opedUser.id)) {
        return callback('oped');
      }

      return callback(null);
    },

    function persist (callback) {
      group.update({$addToSet: {op: opedUser._id}}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: opedUser.id,
        username: opedUser.username,
        avatar: opedUser._avatar(),
        group_id: group.id,
        group_name: '#' + group.name
      };

      that.app.globalChannelService.pushMessage('connector', 'group:op', event, 'user:' + user.id, {}, function (reponse) {
        return callback(null);
      });
    }
    //,
    //function notification (sentEvent, callback) {
    //  Notifications(that.app).getType('groupp').create(opedUser, group, sentEvent.id, callback);
    //}

  ], function (err) {
    if (err) {
      return errors.getHandler('group:op', next)(err);
    }

    next(null, {});
  });
};
