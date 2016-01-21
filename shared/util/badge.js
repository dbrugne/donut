var async = require('async');
var UserModel = require('../models/user');
var NotificationModel = require('../models/notification');

module.exports = function (userId, callback) {
  if (!userId) {
    return callback('badge: userId is required');
  }
  async.waterfall([
    function countDiscussion (cb) {
      UserModel.unviewedCount(userId, cb);
    },
    function countNotification (discussion, cb) {
      NotificationModel.unviewedCount(userId, function (err, notification) {
        if (err) {
          return cb(err);
        }

        return cb(null, discussion, notification);
      });
    }
  ], function (err, discussion, notification) {
    if (err) {
      return callback(err);
    }

    return callback(null, discussion, notification, (discussion + notification));
  });
};
