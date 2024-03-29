'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var NotificationModel = require('../../../../../shared/models/notification');
var conf = require('../../../../../config/index');
var parse = require('../../../../../shared/io/parse');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

/**
 * Checks conditions and create grouprequest notification
 *
 * @param user (User|String)
 * @param group (Group|String)
 * @param event (Obj)
 * @param done
 */
Notification.prototype.create = function (user, group, event, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveGroup(group),

    function checkStatus (userModel, groupModel, callback) {
      that.facade.app.statusService.getStatusByUid(userModel.id, function (err, status) {
        if (err) {
          return callback(err);
        }

        return callback(null, userModel, groupModel, status);
      });
    },

    function checkPreferences (userModel, groupModel, status, callback) {
      if (that.type === 'groupinvite' && !userModel.preferencesValue('notif:invite')) {
        logger.debug('groupInviteType.create no notification due to user preferences');
        return callback(true);
      }
      return callback(null, userModel, groupModel, status);
    },

    function avoidRepetitive (userModel, groupModel, status, callback) {
      if (that.facade.options.force === true || that.type !== 'groupinvite') {
        return callback(null, userModel, groupModel, status);
      }
      var criteria = {
        type: that.type,
        time: {
          $gte: new Date((Date.now() - 1000 * conf.notifications.types.groupinvite.creation))
        },
        'data.group': groupModel._id,
        'data.by_user': event.by_user_id
      };
      NotificationModel.findOne(criteria).count(function (err, count) {
        if (err) {
          return callback(err);
        }
        if (count) {
          logger.debug('roomJoinType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, userModel, groupModel, status);
      });
    },

    function save (userModel, groupModel, status, callback) {
      var data = {
        by_user: event.by_user_id,
        group: groupModel._id
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

        logger.info('groupRequestType.create notification created: ' + that.type + ' for ' + userModel.username);
        that.sendToBrowser(model, userModel, groupModel, event, function () {
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

Notification.prototype.sendToBrowser = function (model, user, group, event, done) {
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
      group: {
        id: group.id,
        name: group.name,
        avatar: group._avatar()
      }
    }
  };
  utils.pushNotification(this.facade.app, eventData, user.id, done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.by_user) {
    return done('groupRequestType.sendEmail model.data left');
  }

  async.waterfall([

    utils.retrieveGroup(model.data.group),

    function send (group, callback) {
      var method, data;
      switch (model.type) {
        case 'groupjoinrequest':
          method = emailer.groupRequest;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupallowed':
          method = emailer.groupAllow;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupdisallow':
          method = emailer.groupDisallow;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupinvite':
          method = emailer.groupInvite;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'grouprefuse':
          method = emailer.groupRefuse;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupban':
          method = emailer.groupBan;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupdeban':
          method = emailer.groupDeban;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupop':
          method = emailer.groupOp;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        case 'groupdeop':
          method = emailer.groupDeop;
          data = {
            username: model.data.by_user.username,
            groupname: group.name
          };
          break;
        default:
          return callback('groupResquestType.sendEmail unknown notification type: ' + model.type);
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
    return done('groupRequestType.sendMobile data left');
  }

  async.waterfall([

    utils.retrieveGroup(model.data.group),

    function send (group, callback) {
      if (['groupjoinrequest', 'groupallowed', 'grouprefuse', 'groupinvite',
          'groupdisallow', 'groupban', 'groupdeban', 'groupop', 'groupdeop'].indexOf(model.type) === -1) {
        return callback('roomPromoteType.sendMobile unknown notification type: ' + model.type);
      }
      var method;
      switch (model.type) {
        case 'groupjoinrequest':
          method = parse.groupJoinRequest;
          break;
        case 'groupallowed':
          method = parse.groupAllowed;
          break;
        case 'groupdisallow':
          method = parse.groupDisallow;
          break;
        case 'groupinvite':
          method = parse.groupInvite;
          break;
        case 'grouprefuse':
          method = parse.groupRefuse;
          break;
        case 'groupban':
          method = parse.groupBan;
          break;
        case 'groupdeban':
          method = parse.groupDeban;
          break;
        case 'groupop':
          method = parse.groupOp;
          break;
        case 'groupdeop':
          method = parse.groupDeop;
          break;
      }

      var avatar = (['groupjoinrequest'].indexOf(model.type) !== -1)
        ? model.data.by_user._avatar()
        : group._avatar();
      method(model.user._id.toString(), model.data.by_user.username, group.name, avatar, callback);
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
    return done('groupRequest population error: params');
  }

  NotificationModel.findOne({_id: notification._id})
    .populate({
      path: 'data.by_user',
      model: 'User',
      select: 'facebook username local avatar'})
    .populate({
      path: 'data.group',
      model: 'Group',
      select: 'avatar name'})
    .exec(function (err, n) {
      if (err) {
        return done(err);
      }
      if (!notification) {
        return done(null);
      }

      return done(null, n);
    });
};
