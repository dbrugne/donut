'use strict';
var errors = require('../../../util/errors');
var async = require('async');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group || group.deleted) {
        return callback('group-not-found');
      }

      return callback(null);
    },

    function persistOnUser (callback) {
      user.groups.addToSet(group.id);
      user.save(function (err) {
        return callback(err);
      });
    },

    function sendToUserClients (callback) {
      var groupsInfos = {
        identifier: group.getIdentifier(),
        name: group.name,
        group_id: group.id,
        id: group.id,
        avatar: group._avatar(),
        last_event_at: group.last_event_at
      };
      that.app.globalChannelService.pushMessage('connector', 'group:join', groupsInfos, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:join', next)(err);
    }

    return next(null, {success: true});
  });
};
