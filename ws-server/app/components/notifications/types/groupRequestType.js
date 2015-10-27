'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var NotificationModel = require('../../../../../shared/models/notification');

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
  this.facade.app.globalChannelService.pushMessage('connector', 'notification:new', eventData, 'user:' + user.id, {}, done);
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
          method = emailer.groupJoinRequest;
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
      }
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};
