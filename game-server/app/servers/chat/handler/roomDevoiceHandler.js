var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
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
 * Handle room devoice logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.devoice = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:devoice require room name param');


      if (!data.username)
        return callback('room:devoice require username param');

      return callback(null);
    },

    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:devoice: '+err);

        if (!room)
          return callback('Unable to retrieve room in room:devoice: '+data.name);

        if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
          return callback('This user '+session.uid+' isn\'t able to devoice another user in this room: '+data.name);

        return callback(null, room);
      });
    },

    function retrieveUser(room, callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in room:devoice: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:devoice: '+session.uid);

        return callback(null, room, user);
      });
    },

    function retrieveDevoiceUser(room, user, callback) {
      User.findByUsername(data.username).exec(function (err, devoiceUser) {
        if (err)
          return callback('Error while retrieving devoiceUser '+devoiceUser.id+' in room:devoice: '+err);

        if (!devoiceUser)
          return callback('Unable to retrieve devoiceUser in room:devoice: '+devoiceUser.id);

        if (room.isOwner(devoiceUser))
          return callback(devoiceUser.username + 'is Owner and can not be DEVOICE of '+room.name);

        if (room.isDevoice(devoiceUser.id))
          return callback('This user '+devoiceUser.username+' is already devoice');

        return callback(null, room, user, devoiceUser);
      });
    },

    function persist(room, user, devoiceUser, callback) {

      var devoice = {
        user: devoiceUser._id,
        devoice_at: new Date()
      };
      room.update({$addToSet: { devoices: devoice }}, function(err) {
        if (err)
          return callback('Unable to persist devoice of '+devoiceUser._id.toString()+' on '+room.name);

        return callback(null, room, user, devoiceUser);
      });
    },

    function prepareEvent(room, user, devoiceUser, callback) {
      var event = {
        name			 : room.name,
        id				 : room.id,
        by_user_id : user._id.toString(),
        by_username: user.username,
        by_avatar  : user._avatar(),
        user_id: devoiceUser._id.toString(),
        username: devoiceUser.username,
        avatar: devoiceUser._avatar()
      };

      return callback(null, room, user, devoiceUser, event);
    },

    function historizeAndEmit(room, user, devoiceUser, event, callback) {
      roomEmitter(that.app, 'room:devoice', event, function(err, sentEvent) {
        if (err)
          return callback('Error while emitting room:devoice in '+room.name+': '+err);

        return callback(null, room, user, devoiceUser, sentEvent);
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
