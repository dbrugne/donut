var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var NotificationModel = require('../../../../../shared/models/notification');
var Notifications = require('../../../components/notifications');
var common = require('@dbrugne/donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check(callback) {

      if (!data.id)
        return callback('id parameter is mandatory for notifications:done');

      NotificationModel.findOne({_id: data.id}, function (err, notification) {
        if (err)
          return callback('Error while retrieving notification: ' + err);

        if (notification.user.toString() !== user.id)
          return callback('This notification is not associated to this user');

        return callback(null, notification);
      });
    },

    function markAsDone(notification, callback) {
      Notifications(that.app).markNotificationsAsDone(user.id, [notification.id], function (err) {
        return callback(err, notification);
      });
    },

    function broadcast(notification, callback) {
      var event = {
        notification: notification.id
      };
      that.app.globalChannelService.pushMessage('connector', 'notification:done', event, 'user:' + user.id, {}, function (err) {
        return callback(err, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[notification:done] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};