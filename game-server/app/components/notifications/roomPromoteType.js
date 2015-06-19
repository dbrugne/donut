var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var Room = require('../../../../shared/models/room');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');

var FREQUENCY_LIMITER = 1; // 1mn

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.type = 'roompromote';

Notification.prototype.shouldBeCreated = function(type, user, data) {

  var that = this;
  async.waterfall([

    function checkOwn(callback) {
      if (data.event.by_user_id == user._id.toString())
        return callback('no notification due to my own message');
      else
        return callback(null);
    },

    function checkPreferences(callback) {
      var prefNothingKey = 'room:notif:nothing:__what__'.replace('__what__', data.room.name);
      var prefKey = 'room:notif:roompromote:__what__'.replace('__what__', data.room.name); // same preferences for op, deop, kick...
      if (user.preferencesValue(prefNothingKey) || !user.preferencesValue(prefKey))
        return callback('no notification due to user preferences');
      else
        return callback(null);
    },

    function checkRepetive(callback) {
      var delay = Date.now() - 1000*60*FREQUENCY_LIMITER; // 1mn
      NotificationModel.find({
        type: type,
        user: user,
        'data.name': data.room.name,
        'data.by_user_id': data.event.by_user_id,
        time: {$gte: new Date(delay) }
      }).count(function(err, count) {
        if (err)
          return callback(err);
        else if (count > 0)
          return callback('no notification due to repetitive');
        else
          return callback(null);
      });
    }

  ], function(err) {
    if (err)
      return logger.error(err+': '+type+' for '+user.username);

    that.create(type, user, data);
  });
};

Notification.prototype.create = function(type, user, data) {
  // cleanup data
  var wet = _.clone(data.event);
  var dry = _.omit(wet, [
    'name',
    'time',
    'user_id',
    'avatar',
    'username',
    'by_user_id',
    'by_avatar',
    'by_username'
  ]);

  dry.user = wet.user_id;
  if (wet.by_user_id)
    dry.by_user = wet.by_user_id;
  if (data.room)
    dry.room = data.room.id;
  var model = NotificationModel.getNewModel(type, user, dry);
  var that = this;
  model.save(function(err) {
    if (err)
      logger.error(err);
    else
      logger.info('notification created: '+type+' for '+user.username);

    if (model.to_browser && !model.sent_to_browser)
      that.sendToBrowser(model);
  });
};

Notification.prototype.sendToBrowser = function(model) {

  var userId = (model.user._id) ? model.user._id.toString() : model.user;
  var byUserId = (model.data.by_user._id ? model.data.by_user._id.toString() : model.data.by_user);
  var roomId = (model.data.room._id ? model.data.room._id.toString() : model.data.room);
  var that = this;

  async.waterfall([

    function retrieveRoom(callback) {
      Room.findByUid(roomId).exec(function(err, room) {
        if (err)
          return callback(err);
        else
          return callback(null, room);
      });
    },

    function retrieveUser(room, callback) {
      User.findByUid(userId).exec(function(err, user) {
        if (err)
          return callback(err);
        else
          return callback(null, room, user);
      });
    },

    function retrieveByUser(room, user, callback) {
      User.findByUid(byUserId).exec(function(err, by_user) {
        if (err)
          return callback(err);
        else
          return callback(null, room, user, by_user);
      });
    },

    function prepare(room, user, by_user, callback) {

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

/**
 * Will send a Notification by Email
 *
 * @param model Notification
 */
Notification.prototype.sendEmail = function(model) {

  console.log('Notification.prototype.sendEmail');

  if (model.sent_to_email === true)
    return;

  var to = model.data.user.local.email;
  var from = model.data.by_user.username;
  var room = model.data.room;

  switch(model.type) {

    case 'roomop':

      emailer.roomOp(to, from, room, function(err) {
        if (err)
          logger.debug('Unable to sent roomOp email: '+err);
      });
      break;
    case 'roomdeop':

      emailer.roomDeop(to, from, room, function(err) {
        if (err)
          logger.debug('Unable to sent roomDeop email: '+err);
      });
      break;
    case 'roomkick':

      emailer.roomKick(to, from, room, function(err) {
        if (err)
          logger.debug('Unable to sent roomKick email: '+err);
      });
      break;
    case 'roomban':

      emailer.roomBan(to, from, room, function(err) {
        if (err)
          logger.debug('Unable to sent roomBan email: '+err);
      });
      break;
    case 'roomdeban':

      emailer.roomDeban(to, from, room, function(err) {
        if (err)
          logger.debug('Unable to sent roomDeban email: '+err);
      });
      break;

    default:

      logger.debug('roomPromoteType :: Unknown notification type: '+model.type);
      return;
      break;
  }

  model.sent_to_email = true;
  model.sent_to_email_at = new Date();
  model.save();

};

Notification.prototype.sendMobile = function() {

};