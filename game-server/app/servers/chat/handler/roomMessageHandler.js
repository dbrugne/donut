var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var inputUtil = require('../../../util/input');
var imagesUtil = require('../../../util/images');
var keenio = require('../../../../../shared/io/keenio');
var Notifications = require('../../../components/notifications');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room message logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.message = function (data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory for room:message');

      return callback(null);
    },

    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:message: ' + err);

        if (!room)
          return callback('Unable to retrieve room in room:message: ' + data.name);

        return callback(null, room);
      });
    },

    function retrieveUser(room, callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user ' + session.uid + ' in room:message: ' + err);

        if (!user)
          return callback('Unable to retrieve user in room:message: ' + session.uid);

        if (room.isDevoice(user.id))
          return callback('User is Devoice, he is not send message');

        return callback(null, room, user);
      });
    },

    function checkHeIsIn(room, user, callback) {
      // Test if the current user is in room
      if (room.users.indexOf(user.id) === -1)
        return callback('room:message, this user ' + session.uid + ' is not currently in room ' + room.name);

      return callback(null, room, user);
    },

    function prepareEvent(room, user, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      // images filtering
      var images = imagesUtil.filter(data.images);

      if (!message && !images)
        return callback('Empty message (no text, no image)');

      var event = {
        name: room.name,
        id: room.id,
        time: Date.now(),
        user_id: user._id.toString(),
        username: user.username,
        avatar: user._avatar()
      };
      if (message)
        event.message = message;
      if (images && images.length)
        event.images = images;

      return callback(null, room, event);
    },

    function historizeAndEmit(room, event, callback) {
      roomEmitter(that.app, 'room:message', event, function (err, sentEvent) {
        if (err)
          return callback(err);

        return callback(null, room, sentEvent);
      });
    },

    function mentionNotification(room, sentEvent, callback) {
      var reg = /@\[[^\]]+\]\(user:([^)]+)\)/g; // @todo yls get from config
      var found;
      var usersIds = [];
      while ((found = reg.exec(sentEvent.message)) !== null) {
        if (found[1] && room.users.indexOf(found[1]) !== -1) // mentionned user is in room?
          usersIds.push(found[1]);
      }

      if (!usersIds.length)
        return callback(null, room, sentEvent);

      // max 5 mentionned are notified by message
      usersIds = _.first(usersIds, 5);

      async.each(usersIds, function (userId, fn) {
        Notifications(that.app).getType('usermention').create(userId, room, sentEvent.id, fn);
      }, function (err) {
        if (err)
          logger.error(err);
        callback(null, room, sentEvent);
      });
    },

    function messageNotification(room, sentEvent, callback) {
      // @todo : change pattern for this event (particularly frequent) and tag historyRoomModel as "to_be_consumed" and implement a consumer to treat notifications asynchronously
      Notifications(that.app).getType('roommessage').create(room, sentEvent.id, function (err) {
        if (err)
          logger.error(err);
        return callback(null, room, sentEvent);
      });
    },

    function tracking(room, event, callback) {
      var messageEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: session.uid,
          username: session.settings.username,
          admin: (session.settings.admin === true)
        },
        room: {
          name: room.name
        },
        message: {
          length: event.message.length,
          images: (event.images && event.images.length) ? event.images.length : 0
        }
      };
      keenio.addEvent("room_message", messageEvent, function (err, res) {
        if (err)
          logger.error('Error while tracking room_message in keen.io: ' + err);

        return callback(null);
      });
    }

  ], function (err) {
    if (err && err != 'admin')
      logger.error(err);

    next(null); // even for .notify
  });

};