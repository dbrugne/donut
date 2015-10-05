'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
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
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!group.isOwner(user.id) && session.settings.admin !== true) {
        return callback('no-admin-owner');
      }

      if (group.permanent === true) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function kick (callback) {
      var event = {
        name: group.name,
        id: group.id,
        room_id: group.id,
        reason: 'deleted'
      };
      that.app.globalChannelService.pushMessage('connector', 'room:leave', event, group.name, {}, function (err) {
        if (err) {
          logger.error(err);
        } // not 'return', we delete even if error happen
        return callback(null);
      });
    },

    function destroy (callback) {
      that.app.globalChannelService.destroyChannel(group.name, function (err) {
        if (err) {
          logger.error(err);
        } // not 'return', we continue even if error happen
        return callback(null);
      });
    },

    function persist (callback) {
      group.deleted = true;
      group.save(callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:delete', next)(err);
    }

    next(null, {success: true});
  });
};
