'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var common = require('@dbrugne/donut-common/server');
var _ = require('underscore');
var async = require('async');
var UserModel = require('../../../../../shared/models/user');
var RoomModel = require('../../../../../shared/models/room');
var NotificationModel = require('../../../../../shared/models/notification');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var conf = require('../../../../../config/index');
var parse = require('../../../../../shared/io/parse');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.create = function (room, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveRoom(room),

    function avoidRepetitive (roomModel, callback) {
      if (that.facade.options.force === true) {
        return callback(null, roomModel);
      }

      var criteria = {
        type: that.type,
        time: {
          $gte: new Date((Date.now() - 1000 * conf.notifications.types.roommessage.creation))
        },
        'data.room': roomModel._id
      };
      NotificationModel.findOne(criteria).count(function (err, count) {
        if (err) {
          return callback(err);
        }
        if (count) {
          logger.debug('roomMessageType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, roomModel);
      });
    },

    utils.retrieveHistoryRoom(history),

    function retrieveUserList (roomModel, historyModel, callback) {
      UserModel.findRoomUsersHavingPreference(roomModel, that.type, historyModel.user.id, function (err, users) {
        if (err) {
          return callback(err);
        }
        if (!users.length) {
          logger.debug('roomMessageType.create no notification created: 0 user concerned');
          return callback(true);
        }

        return callback(null, roomModel, historyModel, users);
      });
    },

    function checkStatus (roomModel, historyModel, users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err) {
          return callback('roomMessageType.create error while retrieving user statuses: ' + err);
        }

        return callback(null, roomModel, historyModel, users, statuses);
      });
    },

    function prepare (roomModel, historyModel, users, statuses, callback) {
      var notificationsToCreate = [];
      _.each(users, function (user) {
        // online user
        if (statuses[ user.id ] && that.facade.options.force !== true) {
          return;
        }

        var model = NotificationModel.getNewModel(that.type, user._id, {
          event: historyModel._id,
          room: roomModel._id
        });

        model.to_browser = false; // will not be displayed in browser on next
                                  // connection
        model.to_email = (!user.getEmail()
          ? false
          : user.preferencesValue('notif:channels:email'));
        model.to_mobile = user.preferencesValue('notif:channels:mobile');

        if (that.facade.options.force === true) {
          model.to_email = true;
          model.to_mobile = true;
        }

        notificationsToCreate.push(model);
      });

      return callback(null, notificationsToCreate);
    },

    function create (notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, function (err, createdNotifications) {
        if (err) {
          return callback(err);
        }

        logger.debug('roomMessageType.create ' + createdNotifications.length + ' notifications created');
        return callback(null);
      });
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return logger.error('roomMessageType.sendEmail data.event left');
  }

  async.waterfall([

    function retrieveEvents (callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.event.toString(), model.user.id, 5, 10, true, function (err, events) {
        if (err) {
          return callback(err);
        }

        return callback(null, events);
      });
    },

    function mentions (events, callback) {
      _.each(events, function (event, index, list) {
        if (!event.data.message) {
          return;
        }

        list[ index ].data.message = utils.mentionize(event.data.message, {
          style: 'color: ' + conf.room.default.color + ';'
        });
      });

      callback(null, events);
    },

    function send (events, callback) {
      var messages = [];
      _.each(events, function (event) {
        var isCurrentMessage = (model.data.event.toString() === event.data.id);
        messages.push({
          current: isCurrentMessage,
          user_avatar: common.cloudinary.prepare(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_full: utils.longDateTime(event.data.time)
        });
      });

      if (model.user.getEmail()) {
        emailer.roomMessage(model.user.getEmail(), messages, model.data.room.getIdentifier(), common.cloudinary.prepare(events[0]['data']['room_avatar'], 90), callback);
      }
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};

Notification.prototype.sendMobile = function (model, done) {
  if (!model.data || !model.data.event || !model.user || !model.user._id) {
    return logger.error('roomMessageType.sendMobile data left');
  }

  async.waterfall([

    function retrieveEvents (callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.event.toString(), model.user.id, 5, 10, true, function (err, events) {
        if (err) {
          return callback(err);
        }

        return callback(null, events);
      });
    },

    function mentions (events, callback) {
      // @todo what do we do with mentions ?
      _.each(events, function (event, index, list) {
        if (!event.data.message) {
          return;
        }

        list[ index ].data.message = common.markup.toText(event.data.message);
      });

      callback(null, events);
    },

    function send (events, callback) {
      async.eachLimit(events, 10, function (event, cb) {
        parse.roomMessage(model.user._id.toString(), model.data.room.getIdentifier(), event.data.message, cb);
      }, function (err) {
        return callback(err);
      });
    },

    function persist (callback) {
      model.sent_to_mobile = true;
      model.sent_to_mobile_at = new Date();
      model.save(callback);
    }

  ], done);
};

Notification.prototype.populateNotification = function (notification, done) {
  if (!notification || !notification.data || !notification.data.event) {
    return done('roomMessage population error: params');
  }

  HistoryRoomModel.findOne({_id: notification.data.event.toString()})
    .populate('user', 'username avatar color facebook')
    .populate('by_user', 'username avatar color facebook')
    .populate('room', 'avatar color name group')
    .exec(function (err, event) {
      if (err) {
        return done(err);
      }
      if (!event) {
        return done(null);
      }

      RoomModel.populate(event, {
        path: 'room.group',
        model: 'Group',
        select: 'name'
      }, function (err, docs) {
        if (err) {
          return done(err);
        }

        notification.data.event = docs;
        return done(null, notification);
      });
    });
};