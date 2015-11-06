'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var filesUtil = require('../../../util/files');
var keenio = require('../../../../../shared/io/keenio');
var Notifications = require('../../../components/notifications');
var GroupModel = require('../../../../../shared/models/group');

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

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isIn(user.id)) {
        return callback('not-in');
      }

      if (room.isDevoice(user.id)) {
        return callback('devoiced');
      }

      if (data.special && ['me', 'random'].indexOf(data.special) === -1) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function prepareMessage (callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      // files filtering
      var files = filesUtil.filter(data.files);

      if (!message && !files) {
        return callback('message-wrong-format');
      }

      // mentions
      inputUtil.mentions(message, function (err, message, markups) {
        return callback(err, message, files, markups.users);
      });
    },

    function broadcast (message, files, mentions, callback) {
      var event = {
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };
      if (message) {
        event.message = message;
      }
      if (files && files.length) {
        event.files = files;
      }
      if (data.special) {
        event.special = data.special;
      }

      roomEmitter(that.app, user, room, 'room:message', event, function (err, sentEvent) {
        if (err) {
          return callback(err);
        }

        return callback(null, sentEvent, mentions);
      });
    },

    function persist (sentEvent, mentions, callback) {
      // Update topic and activity date
      room.lastactivity_at = Date.now();
      room.save(function (err) {
        return callback(err, sentEvent, mentions);
      });
    },

    function persistOnGroup (sentEvent, mentions, callback) {
      if (!room.get('group')) {
        return callback(null, sentEvent, mentions);
      }

      GroupModel.update({_id: room.get('group').get('id')}, {lastactivity_at: Date.now()}, {multi: false}, function (err) {
        return callback(err, sentEvent, mentions);
      });
    },

    function mentionNotification (sentEvent, mentions, callback) {
      if (!mentions || !mentions.length) {
        return callback(null, sentEvent);
      }

      var usersIds = _.first(_.map(mentions, 'id'), 10);
      async.each(usersIds, function (userId, fn) {
        if (!userId) {
          // happens when a non-existing username is mentionned
          return fn(null);
        }
        Notifications(that.app).getType('usermention').create(userId, room, sentEvent.id, fn);
      }, function (err) {
        if (err) {
          logger.error(err);
        }
        callback(null, sentEvent);
      });
    },

    function messageNotification (sentEvent, callback) {
      // @todo dbr : change pattern for this event (particularly frequent) and tag historyRoomModel as "to_be_consumed" and
      //         implement a consumer to treat notifications asynchronously
      Notifications(that.app).getType('roommessage').create(room, sentEvent.id, function (err) {
        if (err) {
          logger.error(err);
        }
        return callback(null, sentEvent);
      });
    },

    function tracking (event, callback) {
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
          length: (event.message && event.message.length) ? event.message.length : 0,
          images: (event.files && event.files.length) ? event.files.length : 0
        }
      };
      keenio.addEvent('room_message', messageEvent, function (err, res) {
        if (err) {
          logger.error(err);
        }
        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:message', next)(err);
    }

    return next(null, { success: true });
  });
};
