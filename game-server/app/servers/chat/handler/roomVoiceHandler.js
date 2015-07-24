var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room voice logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.voice = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:voice require room name param');

      if (!data.username)
        return callback('room:voice require username param');

      return callback(null);
    },

    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:voice: '+err);

        if (!room)
          return callback('Unable to retrieve room in room:voice: '+data.name);

        if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
          return callback('This user '+session.uid+' isn\'t able to voice another user in this room: '+data.name);

        return callback(null, room);
      });
    },

    function retrieveUser(room, callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in room:voice: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:voice: '+session.uid);

        return callback(null, room, user);
      });
    },

    function retrieveVoiceUser(room, user, callback) {
      User.findByUsername(data.username).exec(function (err, voiceUser) {
        if (err)
          return callback('Error while retrieving voiceUser '+session.uid+' in room:voice: '+err);

        if (!voiceUser)
          return callback('Unable to retrieve voiceUser in room:voice: '+session.uid);

        // Is the targeted user already VOICE of this room
        if (room.devoices.indexOf(voiceUser._id) !== -1)
          return callback('User '+voiceUser.username+' is already VOICE of '+room.name);

        if (room.isOwner(voiceUser))
          return callback(voiceUser.username + 'is Owner and can not be VOICE of '+room.name);

        return callback(null, room, user, voiceUser);
      });
    },

    function persist(room, user, voiceUser, callback) {
      if (!room.devoices || !room.devoices.length)
        return callback('There is no user devoice from this room');

      var subDocument = _.find(room.devoices, function(devoice) {
        if (devoice.user.toString() == voiceUser._id.toString())
          return true;
      });
      room.devoices.id(subDocument._id).remove();
      room.save(function(err) {
        if (err)
          return callback('Unable to persist voice of '+voiceUser.username+' on '+room.name);

        return callback(null, room, user, voiceUser);
      });
    },

    function prepareEvent(room, user, voiceUser, callback) {
      var event = {
        name: room.name,
        id: room.id,
        by_user_id : user._id.toString(),
        by_username: user.username,
        by_avatar  : user._avatar(),
        user_id: voiceUser._id.toString(),
        username: voiceUser.username,
        avatar: voiceUser._avatar()
      };

      return callback(null, room, user, voiceUser, event);
    },

    function historizeAndEmit(room, user, voiceUser, event, callback) {
      roomEmitter(that.app, 'room:voice', event, function(err, sentEvent) {
        if (err)
          return callback('Error while emitting room:voice in '+room.name+': '+err);

        return callback(null, room, user, voiceUser, sentEvent);
      });
    },

  ], function(err) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, {});
  });

};
