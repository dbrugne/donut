'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var common = require('@dbrugne/donut-common/server');
var _ = require('underscore');
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var NotificationModel = require('../../../../../shared/models/notification');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var parse = require('../../../../../shared/io/parse');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.create = function (user, room, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveRoom(room),

    utils.retrieveHistoryRoom(history),

    function checkOwn (userModel, roomModel, historyModel, callback) {
      if (!userModel) {
        logger.debug('userMentionType.create no notification due to unknown user: ' + user);
        return callback(true);
      }
      if (historyModel.user.id === userModel.id) {
        logger.debug('userMentionType.create no notification due to my own message');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function checkPreferences (userModel, roomModel, historyModel, callback) {
      var key1 = 'room:notif:nothing:__what__'.replace('__what__', roomModel.id);
      var key2 = 'room:notif:__type__:__what__'.replace('__type__', that.type).replace('__what__', roomModel.id);
      if (userModel.preferencesValue(key1) || !userModel.preferencesValue(key2)) {
        logger.debug('userMentionType.create no notification due to user preferences');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function avoidRepetitive (userModel, roomModel, historyModel, callback) {
      if (that.facade.options.force === true) {
        return callback(null, userModel, roomModel, historyModel);
      }

      // only check the case when a message is edited (room:message:edit)
      NotificationModel.findOne({ 'data.event': historyModel._id }).count(function (err, count) {
        if (err) {
          return callback(err);
        }
        if (count) {
          logger.debug('userMessageType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, userModel, roomModel, historyModel);
      });
    },

    function checkStatus (userModel, roomModel, historyModel, callback) {
      that.facade.app.statusService.getStatusByUid(userModel.id, function (err, status) {
        if (err) {
          return callback(err);
        }

        return callback(null, userModel, roomModel, historyModel, status);
      });
    },

    function save (userModel, roomModel, historyModel, status, callback) {
      var model = NotificationModel.getNewModel(that.type, userModel._id, {
        event: historyModel._id,
        room: roomModel._id
      });
      model.to_browser = true;
      model.to_email = (!userModel.getEmail()
        ? false
        : (status
        ? false
        : userModel.preferencesValue('notif:channels:email')));
      model.to_mobile = (status
        ? false
        : userModel.preferencesValue('notif:channels:mobile'));

      if (that.facade.options.force === true) {
        model.to_email = true;
        model.to_mobile = true;
      }

      model.save(function (err) {
        if (err) {
          return callback(err);
        }

        logger.info('userMentionType.create notification created: ' + that.type + ' for ' + userModel.username);

        that.sendToBrowser(model, userModel, roomModel, historyModel, callback);
      });
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendToBrowser = function (model, user, room, history, done) {
  var event = {
    id: model.id,
    time: model.time,
    type: model.type,
    viewed: false,
    data: {
      user: {
        avatar: user._avatar(),
        id: user.id,
        username: user.username
      },
      by_user: {
        avatar: history.user._avatar(),
        id: history.user.id,
        username: history.user.username
      },
      room: {
        id: room.id,
        name: room.getIdentifier(),
        avatar: room._avatar()
      },
      message: history.data.message
    }
  };

  utils.pushNotification(this.facade.app, event, user.id, done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return done('roomPromoteType.sendEmail data.event left');
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

        list[ index ].data.message = utils.mentionize(event.data.message, {});
      });

      callback(null, events);
    },

    function send (events, callback) {
      var messages = [];
      var toUsername = events[0]['data']['username'];
      _.each(events, function (event) {
        var isCurrentMessage = (model.data.event.toString() === event.data.id);
        if (isCurrentMessage) {
          toUsername = event.data.username;
        }
        messages.push({
          current: isCurrentMessage,
          user_avatar: common.cloudinary.prepare(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_full: utils.longDateTime(event.data.time)
        });
      });

      if (model.user.getEmail()) {
        emailer.userMention(model.user.getEmail(), messages, toUsername, model.data.room.getIdentifier(), callback);
      } else {
        callback(null);
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
    return done('roomTopicType.sendMobile data left');
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
        var isCurrentMessage = (model.data.event.toString() === event.data.id);
        if (isCurrentMessage) {
          parse.userMention(model.user._id.toString(), event.data.username, model.data.room.getIdentifier(), event.data.message, model.user._avatar(), cb);
        } else {
          return cb(null);
        }
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
    .populate('user', 'username avatar facebook')
    .populate('by_user', 'username avatar facebook')
    .populate('room', 'avatar name group')
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
