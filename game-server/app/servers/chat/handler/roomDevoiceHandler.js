var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var UserModel = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var Notifications = require('../../../components/notifications');

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
 * @param {Object} data name, username, reason from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.devoice = function(data, session, next) {

  var that = this;

  var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : false;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:devoice require room name param');


      if (!data.username)
        return callback('room:devoice require username param');

      return callback(null);
    },

    function retrieveRoom(callback) {
      RoomModel.findByName(data.name).exec(function (err, room) {
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
      UserModel.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in room:devoice: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:devoice: '+session.uid);

        return callback(null, room, user);
      });
    },

    function retrieveDevoicedUser(room, user, callback) {
      UserModel.findByUsername(data.username).exec(function (err, devoicedUser) {
        if (err)
          return callback('Error while retrieving devoicedUser '+devoicedUser.id+' in room:devoice: '+err);

        if (!devoicedUser)
          return callback('Unable to retrieve devoicedUser in room:devoice: '+devoicedUser.id);

        if (room.isOwner(devoicedUser.id))
          return callback(devoicedUser.username + ' is owner and can not be devoiced of '+room.name);

        if (room.isDevoice(devoicedUser.id))
          return callback('This user '+devoicedUser.username+' is already devoiced');

        return callback(null, room, user, devoicedUser);
      });
    },

    function persist(room, user, devoicedUser, callback) {
      var devoice = {
        user: devoicedUser._id,
        devoiced_at: new Date()
      };
      if (reason !== false)
        devoice.reason = reason;

      room.update({$addToSet: { devoices: devoice }}, function(err) {
        if (err)
          return callback('Unable to persist devoice of '+devoicedUser.id+' on '+room.name);

        return callback(null, room, user, devoicedUser);
      });
    },

    function prepareEvent(room, user, devoicedUser, callback) {
      var event = {
        name			 : room.name,
        id				 : room.id,
        by_user_id : user.id,
        by_username: user.username,
        by_avatar  : user._avatar(),
        user_id: devoicedUser.id,
        username: devoicedUser.username,
        avatar: devoicedUser._avatar()
      };

      if (reason !== false)
        event.reason = reason;

      return callback(null, room, user, devoicedUser, event);
    },

    function historizeAndEmit(room, user, devoicedUser, event, callback) {
      roomEmitter(that.app, 'room:devoice', event, function(err, sentEvent) {
        if (err)
          return callback('Error while emitting room:devoice in '+room.name+': '+err);

        return callback(null, room, user, devoicedUser, sentEvent);
      });
    },

    function notification(room, user, devoicedUser, sentEvent, callback) {
      Notifications(that.app).getType('roomdevoice').create(devoicedUser, room, sentEvent.id, callback);
    }

  ], function(err) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, { success: true });
  });

};
