'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var common = require('@dbrugne/donut-common/server');
var _ = require('underscore');
var async = require('async');
var UserModel = require('../../../../../shared/models/user');
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

Notification.prototype.create = function (room, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveRoom(room),

    utils.retrieveHistoryRoom(history),

    function retrieveUserList (roomModel, historyModel, callback) {
      UserModel.findRoomUsersHavingPreference(roomModel, that.type, historyModel.user.id, function (err, users) {
        if (err) {
          return callback(err);
        }
        if (!users.length) {
          logger.debug('roomTopicType.create no notification created: 0 user concerned');
          return callback(true);
        }

        return callback(null, roomModel, historyModel, users);
      });
    },

    function checkStatus (roomModel, historyModel, users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err) {
          return callback('roomTopicType.create error while retrieving user statuses: ' + err);
        }

        return callback(null, roomModel, historyModel, users, statuses);
      });
    },

    function prepare (roomModel, historyModel, users, statuses, callback) {
      var notificationsToCreate = [];
      _.each(users, function (user) {
        var model = NotificationModel.getNewModel(that.type, user._id, {
          event: historyModel._id,
          room: roomModel._id
        });

        model.to_browser = true;
        model.to_email = (!user.getEmail()
          ? false
          : (statuses[ user.id ]
          ? false
          : user.preferencesValue('notif:channels:email')));
        model.to_mobile = (statuses[ user.id ]
          ? false
          : user.preferencesValue('notif:channels:mobile'));

        if (that.facade.options.force === true) {
          model.to_email = true;
          model.to_mobile = true;
        }

        notificationsToCreate.push(model);
      });

      return callback(null, roomModel, historyModel, notificationsToCreate);
    },

    function create (roomModel, historyModel, notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, function (err, createdNotifications) {
        if (err) {
          return callback(err);
        }

        logger.info('roomTopicType.create ' + createdNotifications.length + ' notifications created');
        return callback(null, roomModel, historyModel, createdNotifications);
      });
    },

    function sendToBrowser (roomModel, historyModel, createdNotifications, callback) {
      if (!createdNotifications.length) {
        return callback(null);
      }

      async.eachLimit(createdNotifications, 5, function (model, _callback) {
        that.sendToBrowser(roomModel, model, historyModel, _callback);
      }, callback);
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendToBrowser = function (room, model, history, done) {
  var event = {
    id: model.id,
    time: model.time,
    type: model.type,
    viewed: false,
    data: {
      user: {
        avatar: history.user._avatar(),
        id: history.user.id,
        username: history.user.username
      },
      room: {
        id: history.room.id,
        name: room.getIdentifier(),
        avatar: history.room._avatar()
      },
      topic: history.data.topic
    }
  };
  utils.pushNotification(this.facade.app, event, model.user.toString(), done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return done('roomTopicType.sendEmail data.event left');
  }

  async.waterfall([

    utils.retrieveHistoryRoom(model.data.event.toString()),

    function send (history, callback) {
      var topic = utils.mentionize(history.data.topic, {});
      if (model.user.getEmail()) {
        emailer.roomTopic(model.user.getEmail(), history.user.username, model.data.room.getIdentifier(), topic, callback);
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

    utils.retrieveHistoryRoom(model.data.event.toString()),

    function send (history, callback) {
      var topic = common.markup.toText(history.data.topic);
      parse.roomTopic(model.user._id.toString(), model.data.room.getIdentifier(), topic, model.data.room._avatar(), callback);
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
