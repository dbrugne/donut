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
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!room || room.deleted) {
        return callback('room-not-found');
      }

      return callback(null);
    },

    function tryToJoin (callback) {
      if (room.isOwner(currentUser.id)) {
        return callback(null, false);
      }

      if (room.isBanned(currentUser.id)) {
        return callback(null, true);
      }

      if (room.isGroupBanned(currentUser.id)) {
        return callback(null, true);
      }

      if (!room.isAllowed(currentUser.id) && room.mode === 'private') {
        return callback(null, true);
      }

      if (!currentUser.confirmed && room.mode === 'private') {
        return callback(null, true);
      }

      return callback(null, false);
    },

    function prepareInfos (isBlocked, callback) {
      if (!isBlocked) {
        return callback(null);
      }

      var infos = {
        disclaimer: room.disclaimer,
        identifier: room.getIdentifier(),
        hasPassword: !!room.password,
        allow_user_request: room.allow_user_request,
        isAllowedPending: room.isAllowedPending(currentUser.id)
      };
      if (room.owner && room.owner.username) {
        infos.owner_username = room.owner.username;
      }
      return callback(null, infos);
    }

  ], function (err, infos) {
    if (err) {
      return errors.getHandler('room:become:member', next)(err);
    }

    if (!infos) {
      return next(null, {success: true});
    }
    return next(null, {infos: infos});
  });
};