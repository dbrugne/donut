var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var Room = require('../../../../shared/models/room');
var NotificationModel = require('../../../../shared/models/notification');

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
    'time',
    'avatar',
    'username',
    'by_avatar',
    'by_username'
  ]);

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
  var channel = 'user:'+userId;

  var that = this;
  Room.findByName(model.data.name).exec(function(err, room) {
    if (err) return logger(err);

    User.findByUid(userId).exec(function(err, user) {
      if (err) return logger(err);

      User.findByUid(model.data.by_user_id).exec(function(err, by_user) {
        if (err) return logger(err);

        var event = {
          type: model.type,
          to_desktop: user.preferencesValue('notif:channels:desktop'), // trigger desktop notification
          data: model.data
        };
        event.data.by_username = by_user.username;
        event.data.by_avatar = by_user._avatar();
        event.data.avatar = room._avatar();

        that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', event, channel, {}, function(err) {
          if (err)
            logger.error('Error while sending notification:new message to user clients: '+err);

          logger.debug('notification sent: '+model.type+' for '+model.user);
        });
      });
    });
  });
};

Notification.prototype.sendEmail = function() {

};

Notification.prototype.sendMobile = function() {

};