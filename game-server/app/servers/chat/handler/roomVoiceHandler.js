var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../../../shared/models/room');
var UserModel = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');
var Notifications = require('../../../components/notifications');

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
 * @param {Object} data name, username from client
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
      RoomModel.findByName(data.name).exec(function (err, room) {
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
      UserModel.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in room:voice: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:voice: '+session.uid);

        return callback(null, room, user);
      });
    },

    function retrieveVoicedUser(room, user, callback) {
      UserModel.findByUsername(data.username).exec(function (err, voicedUser) {
        if (err)
          return callback('Error while retrieving voicedUser '+session.uid+' in room:voice: '+err);

        if (!voicedUser)
          return callback('Unable to retrieve voicedUser in room:voice: '+session.uid);

        // is the targeted user already voiced in this room
        if (!room.isDevoice(voicedUser.id))
          return callback('User '+voicedUser.username+' is already voiced in '+room.name);

        if (room.isOwner(voicedUser))
          return callback(voicedUser.username + ' is owner and can not be voiced in '+room.name);

        return callback(null, room, user, voicedUser);
      });
    },

    function persist(room, user, voicedUser, callback) {
      if (!room.devoices || !room.devoices.length)
        return callback('There is no user to devoice in this room: '+room.name);

      var subDocument = _.find(room.devoices, function(devoice) {
        if (devoice.user.toString() == voicedUser.id)
          return true;
      });
      room.devoices.id(subDocument._id).remove();
      room.save(function(err) {
        if (err)
          return callback('Unable to persist voiced of '+voicedUser.username+' on '+room.name);

        return callback(null, room, user, voicedUser);
      });
    },

    function prepareEvent(room, user, voicedUser, callback) {
      var event = {
        name: room.name,
        id: room.id,
        by_user_id : user.id,
        by_username: user.username,
        by_avatar  : user._avatar(),
        user_id: voicedUser.id,
        username: voicedUser.username,
        avatar: voicedUser._avatar()
      };

      return callback(null, room, user, voicedUser, event);
    },

    function historizeAndEmit(room, user, voicedUser, event, callback) {
      roomEmitter(that.app, 'room:voice', event, function(err, sentEvent) {
        if (err)
          return callback('Error while emitting room:voice in '+room.name+': '+err);

        return callback(null, room, user, voicedUser, sentEvent);
      });
    },

    function notification(room, user, voicedUser, sentEvent, callback) {
      Notifications(that.app).getType('roomvoice').create(voicedUser, room, sentEvent.id, callback);
    }

  ], function(err) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, { success: true });
  });

};
