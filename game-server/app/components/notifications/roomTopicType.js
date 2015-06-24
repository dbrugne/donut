var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');

var FREQUENCY_LIMITER = 1; // 1mn

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.type = 'roomtopic';

Notification.prototype.shouldBeCreated = function(type, room, data) {

  var sendToDesktop = false;
  var sendToEmail = false;
  var sendToMobile = false;

  var that = this;
  async.waterfall([

    function retrieveUserList(callback) {
      User.findForTopic(room, data.event.user_id, callback);
    },

    function checkRepetive(users, callback) {
      if (users.length == 0)
        return;

      var user = users[0]; // get first one
      var delay = Date.now() - 1000*60*FREQUENCY_LIMITER; // 1mn
      NotificationModel.find({
        type: that.type,
        user: user,
        'data.from_user_id': data.from_user_id,
        time: {$gte: new Date(delay) }
      }).count(function(err, count) {
        if (err)
          return callback(err);
        else if (count > 0)
          return callback('no notification due to repetitive');
        else
          return callback(null, users);
      });
    },

    function checkStatus(users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function(err, statuses) {
        if (err)
          return callback('Error while retrieving users statuses: '+err);

        return callback(null, users, statuses);
      });
    },

    function prepare(users, statuses, callback) {

      _.each(users, function(user){
        user.status = statuses[user.id];
        sendToDesktop = user.preferencesValue("notif:channels:desktop");
        // User is Offline, check preferences before sending
        if (!user.status) {
          sendToEmail = user.preferencesValue("notif:channels:email");
          sendToMobile = user.preferencesValue("notif:channels:mobile");
        }
      });

      return callback(null, users);
    }
  ], function(err, users) {
    if (err)
      logger.error(err+': '+that.type+' in Room '+room.name);
    else
      _.each(users, function(user){
        that.create(user, room, data, sendToDesktop, sendToEmail, sendToMobile);
      });
  });

};

Notification.prototype.create = function(user, room, data, sendToDesktop, sendToEmail, sendToMobile) {
  var topic = data.event.topic;

  // cleanup data
  var wet = _.clone(data.event);
  var dry = _.omit(wet, [
    'time',
    'topic',
    'avatar',
    'username',
    'user_id',
    'name'
  ]);

  dry.by_user = wet.user_id;
  dry.user = user._id.toString() ;
  dry.room = room._id.toString() ;

  var model = NotificationModel.getNewModel(this.type, user, dry);

  model.to_desktop = sendToDesktop;
  model.to_email = sendToEmail;
  model.to_mobile = sendToMobile;

  var that = this;
  model.save(function(err) {
    if (err)
      logger.error(err);
    else
      logger.info('notification created: '+that.type+' for '+user.username);
  });

  if (!model.sent_to_browser)
    that.sendToBrowser(model, user, room);
};

Notification.prototype.sendToBrowser = function(model, by_user, room) { // @toto yls clean params
  var userId = (model.user._id) ? model.user._id.toString() : model.user;
  var that = this;

  async.waterfall([

    function retrieveUser(callback) {
      User.findByUid(userId).exec(function(err, user) {
        if (err)
          return callback(err);
        else
          return callback(null, user);
      });
    },

    function prepare(user, callback) {

      var notification = {
        id: model.id,
        time: model.time,
        type: model.type,
        viewed: false,
        to_desktop: user.preferencesValue('notif:channels:desktop'), // trigger desktop notification
        data: {
          by_user: {
            avatar: by_user._avatar(),
            id: by_user.id,
            username: by_user.username
          },
          user: {
            avatar: user._avatar(),
            id: user.id,
            username: user.username
          },
          room: {
            id: room.id,
            name: room.name,
            avatar: room._avatar()
          }
        }
      };

      return callback(null, notification);
    },

    function retrieveNotificationCount(notification, callback) {
      NotificationModel.find({
        user: userId,
        done: false,
        viewed: false
      }).count().exec(function(err, count) {
        if (err)
          return callback(err);

        notification.unviewed = count || 0;

        return callback(null, notification);

      });
    }

  ], function(err, notification) {
    if (err)
      return logger.error(err+': in roomPromoteType');

    that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:'+userId, {}, function(err) {
      if (err)
        logger.error('Error while sending notification:new message to user clients: '+err);

      logger.debug('notification sent: '+notification);
    });
  });
};

Notification.prototype.sendEmail = function(model) {

  var to = model.data.user.local.email;
  var from = model.data.by_user.username;
  var room = model.data.room;

  emailer.roomTopic(to, from, room, function(err) {
    if (err)
      logger.debug('Unable to sent roomTopic email: '+err);
  });

  model.sent_to_email = true;
  model.sent_to_email_at = new Date();
  model.save();

};

Notification.prototype.sendMobile = function() {

};