'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var NotificationModel = require('../../../../../shared/models/notification');
var parse = require('../../../../../shared/io/parse');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

/**
 * Checks conditions and create roomrequest notification
 *
 * @param user (User|String)
 * @param room (Room|String)
 * @param event (Obj)
 * @param done
 */
Notification.prototype.create = function (user, room, event, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveRoom(room),

    function checkStatus (userModel, roomModel, callback) {
      that.facade.app.statusService.getStatusByUid(userModel.id, function (err, status) {
        if (err) {
          return callback(err);
        }

        return callback(null, userModel, roomModel, status);
      });
    },

    function checkPreferences (userModel, roomModel, status, callback) {
      if (that.type === 'roominvite' && !userModel.preferencesValue('notif:invite')) {
        logger.debug('roomInviteType.create no notification due to user preferences');
        return callback(true);
      }
      return callback(null, userModel, roomModel, status);
    },

    function save (userModel, roomModel, status, callback) {
      var data = {
        by_user: event.by_user_id,
        room: roomModel._id
      };
      var model = NotificationModel.getNewModel(that.type, userModel._id, data);
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

        logger.info('roomRequestType.create notification created: ' + that.type + ' for ' + userModel.username);
        that.sendToBrowser(model, userModel, roomModel, event, function () {
          return callback(null);
        });
      });
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendToBrowser = function (model, user, room, event, done) {
  var eventData = {
    id: model.id,
    time: model.time,
    type: model.type,
    viewed: false,
    data: {
      by_user: {
        avatar: event.by_avatar,
        id: event.by_user_id,
        username: event.by_username
      },
      user: {
        avatar: event.avatar,
        id: event.user_id,
        username: event.username
      },
      room: {
        id: room.id,
        name: room.getIdentifier(),
        avatar: room._avatar()
      }
    }
  };
  utils.pushNotification(this.facade.app, eventData, user.id, done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.by_user) {
    return done('roomRequestType.sendEmail data.event left');
  }

  async.waterfall([

    utils.retrieveRoom(model.data.room),

    function send (room, callback) {
      var method, data;
      switch (model.type) {
        case 'roomjoinrequest':
          method = emailer.roomJoinRequest;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier()
          };
          break;
        case 'roomallowed':
          method = emailer.roomAllow;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier()
          };
          break;
        case 'roomrefuse':
          method = emailer.roomRefuse;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier()
          };
          break;
        case 'roominvite':
          method = emailer.roomInvite;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier()
          };
          break;
        case 'roomdelete':
          method = emailer.roomDelete;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier(),
            groupname: (model.data.room.group) ? model.data.room.group.name : ''
          };
          break;
        case 'roomcreate':
          method = emailer.roomCreate;
          data = {
            username: model.data.by_user.username,
            roomname: room.getIdentifier()
          };
          break;
        default:
          return callback('roomResquestType.sendEmail unknown notification type: ' + model.type);
      }

      if (model.user.getEmail()) {
        _.bind(method, emailer)(model.user.getEmail(), data, callback);
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
  if (!model.data || !model.user || !model.user._id) {
    return done('roomRequestType.sendMobile data left');
  }

  async.waterfall([

    utils.retrieveRoom(model.data.room),

    function send (room, callback) {
      if (['roomjoinrequest', 'roomallowed', 'roomrefuse', 'roominvite',
          'roomdelete', 'roomcreate'].indexOf(model.type) === -1) {
        return callback('roomRequestType.sendMobile unknown notification type: ' + model.type);
      }
      var method;
      switch (model.type) {
        case 'roomjoinrequest':
          method = parse.roomJoinRequest;
          break;
        case 'roomallowed':
          method = parse.roomAllowed;
          break;
        case 'roomrefuse':
          method = parse.roomRefuse;
          break;
        case 'roominvite':
          method = parse.roomInvite;
          break;
        case 'roomdelete':
          method = parse.roomDelete;
          break;
        case 'roomcreate':
          method = parse.roomCreate;
          break;
      }

      var avatar = (['roomjoinrequest'].indexOf(model.type) !== -1)
        ? model.data.by_user._avatar()
        : room._avatar();
      method(model.user._id.toString(), model.data.by_user.username, room.getIdentifier(), avatar, callback);
    },

    function persist (callback) {
      model.sent_to_mobile = true;
      model.sent_to_mobile_at = new Date();
      model.save(callback);
    }

  ], done);
};

Notification.prototype.populateNotification = function (notification, done) {
  if (!notification || !notification._id) {
    return done('roomRequest population error: params');
  }

  NotificationModel.findOne({_id: notification._id})
    .populate({
      path: 'data.user',
      model: 'User',
      select: 'facebook username local avatar'})
    .populate({
      path: 'data.by_user',
      model: 'User',
      select: 'facebook username local avatar'})
    .populate({
      path: 'data.room',
      model: 'Room',
      select: 'avatar name group'})
    .exec(function (err, n) {
      if (err) {
        return done(err);
      }
      if (!n) {
        return done(null);
      }

      NotificationModel.populate(n, {
        path: 'data.room.group',
        model: 'Group',
        select: 'name'
      }, function (err, docs) {
        if (err) {
          return done(err);
        }

        return done(null, n);
      });
    });
};
