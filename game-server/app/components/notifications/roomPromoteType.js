var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var NotificationModel = require('../../../../shared/models/notification');

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
      var delay = Date.now() - 1000*60*1; // 1mn
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
      logger.error(err+': '+type+' for '+user.username);
    else
      that.create(type, user, data);
  });
};

Notification.prototype.create = function(type, user, data) {
  // cleanup data
  var wet = _.clone(data.event);
  var dry = _.omit(wet, [
    'avatar',
    'username',
    'by_avatar',
    'by_username'
  ]);
  dry.name = data.room.name;

  var model = NotificationModel.getNewModel(type, user, dry);
  var that = this;
  model.save(function(err) {
    if (err)
      logger.error(err);
    else
      logger.info('notification created: '+type+' for '+user.username);
  });
};

Notification.prototype.sendBrowser = function() {
  // @todo : tag for desktop notification (or send a different signal)
};

Notification.prototype.sendEmail = function() {

};

Notification.prototype.sendMobile = function() {

};