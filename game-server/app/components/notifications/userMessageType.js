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

Notification.prototype.type = 'usermessage';

Notification.prototype.shouldBeCreated = function(user, data) {

  var that = this;
  async.waterfall([

      function checkOwn(callback) {
        if (data.from_user_id == user._id.toString())
          return callback('no notification due to my own message');
        else
          return callback(null);
      },

      function checkPreferences(callback) {
        if (!user.preferencesValue('notif:usermessage'))
          return callback('no notification due to user preferences');
        else
          return callback(null);
      },

      function checkStatus(callback) {
        that.facade.uidStatus(user._id.toString(), function(status) {
          if (status)
            return callback('no notification due to user status'); // create only if user is offline
          else
            return callback(null);
        });
      },

      function checkRepetive(callback) {
        var delay = Date.now() - 1000*60*15; // 15mn
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
            return callback(null);
        });
      }

  ], function(err) {
    if (err)
      logger.error(err+': '+that.type+' for '+user.username);
    else
      that.create(user, data);
  });

};

Notification.prototype.create = function(user, data) {
  // cleanup data
  var wet = _.clone(data);
  var dry = _.omit(wet, [
    'time',
    'to',
    'from',
    'from_username',
    'from_avatar',
    'to_username'
  ]);

  var model = NotificationModel.getNewModel(this.type, user, dry);

  var that = this;
  model.save(function(err) {
    if (err)
      logger.error(err);
    else
      logger.info('notification created: '+that.type+' for '+user.username);
  });
};

Notification.prototype.sendBrowser = function() {
  // @todo : tag for desktop notification (or send a different signal)
};

Notification.prototype.sendEmail = function() {

};

Notification.prototype.sendMobile = function() {

};