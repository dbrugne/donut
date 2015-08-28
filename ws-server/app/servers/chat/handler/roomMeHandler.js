var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var keenio = require('../../../../../shared/io/keenio');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {

  var user = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory');

      if (!room)
        return callback('unable to retrieve room from ' + data.name);

      if (room.users.indexOf(user.id) === -1)
        return callback('this user ' + user.id + ' is not currently in room ' + room.name);

      if (room.isDevoice(user.id))
        return callback('user is devoiced, he can\'t send message "/me" in room');

      return callback(null);
    },

    function prepareMessage(callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('empty message (no text)');

      // mentions
      inputUtil.mentions(message, function(err, message, markups) {
        return callback(err, message, markups.users);
      });
    },

    function broadcast(message, mentions, callback) {
      var event = {
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        message: message
      };
      roomEmitter(that.app, user, room, 'room:me', event, function (err, sentEvent) {
        if (err)
          return callback(err);

        return callback(null, sentEvent, mentions);
      });
    },

    function mentionNotification(sentEvent, mentions, callback) {
      if (!mentions.length)
        return callback(null, sentEvent);

      var usersIds = _.first(_.map(mentions, 'id'), 10);
      async.each(usersIds, function (userId, fn) {
        Notifications(that.app).getType('usermention').create(userId, room, sentEvent.id, fn);
      }, function (err) {
        if (err)
          logger.error(err);
        callback(null, sentEvent);
      });
    },

    function messageNotification(sentEvent, callback) {
      Notifications(that.app).getType('roommessage').create(room, sentEvent.id, function (err) {
        if (err)
          logger.error(err);
        return callback(null, sentEvent);
      });
    },

    function tracking(event, callback) {
      var messageEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: user.id,
          username: user.username,
          admin: (session.settings.admin === true)
        },
        room: {
          name: room.name
        },
        message: {
          length: (event.message && event.message.length) ? event.message.length : 0
        }
      };
      keenio.addEvent("room_me", messageEvent, function (err, res) {
        if (err)
          logger.error(err);

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[room:me] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, { success: true });
  });

};