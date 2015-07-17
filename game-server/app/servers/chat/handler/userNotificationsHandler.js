var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var NotificationModel = require('../../../../../shared/models/notification');
var Notifications = require('../../../components/notifications');
var ObjectId = require('mongoose').Types.ObjectId;

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handler user read notifications logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next step callback
 *
 */
handler.read = function (data, session, next) {

  var that = this;

  async.waterfall([

    function retrieveUser(callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user ' + session.uid + ' in user:preferences:read: ' + err);

        if (!user)
          return callback('Unable to retrieve user in user:preferences:read: ' + session.uid);

        return callback(null, user);
      });
    },

    function retrieveNotifications(user, callback) {
      // Get only unviewed notifications, data.number max
      Notifications(that.app).retrieveUserNotifications(user._id.toString(), data, function (err, notifications) {
        if (err)
          return callback('Error while retrieving notifications for ' + session.uid + ': ' + err);

        return callback(null, user, notifications);
      });
    },

    function prepare(user, notifications, callback) {
      var event = {notifications: []};

      _.each(notifications, function (notification) {
        var d = {
          id: notification.id,
          type: notification.type,
          time: notification.time,
          viewed: notification.viewed,
          data: {}
        };

        if (notification.data.event.from) {
          d.data.by_user = notification.data.event.from;
          d.data.by_user.avatar = notification.data.event.from._avatar();
        }

        if (notification.data.event.to) {
          d.data.user = notification.data.event.to;
          d.data.user.avatar = notification.data.event.to._avatar();
        }

        if (notification.data.event.user) {
          d.data.user = notification.data.event.user;
          d.data.user.avatar = notification.data.event.user._avatar();
        }

        if (notification.data.event.by_user) {
          d.data.by_user = notification.data.event.by_user;
          d.data.by_user.avatar = notification.data.event.by_user._avatar();
        }

        if (notification.data.event.room) {
          d.data.room = notification.data.event.room;
          d.data.room.avatar = notification.data.event.room._avatar();
        }

        event.notifications.push(d);
      });

      return callback(null, user, event);
    },

    function retrieveUnread(user, event, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user._id.toString(), function (err, count) {
        if (err)
          return callback('Error while retrieving notifications for ' + session.uid + ': ' + err);

        event.unviewed = count || 0;

        return callback(null, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};

/**
 * Handler user viewed notifications logic
 * Used to tag selected notifications as "viewed"
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next step callback
 *
 */
handler.viewed = function (data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      // Mark all as read
      if (data.all) {
        Notifications(that.app).retrieveUserNotificationsUnviewed(session.uid, function (err, notifications) {
          if (err)
            return callback('Error while retrieving notifications for ' + session.uid + ': ' + err);

          return callback(null, notifications);
        });
      } else {
        var notifications = [];
        if (!data.ids || !_.isArray(data.ids))
          return callback('ids parameter is mandatory for notifications:viewed');

        // filter array to preserve only valid
        _.each(data.ids, function (elt) {
          if (ObjectId.isValid(elt))
            notifications.push(elt);
        });

        // test if at least one entry remain
        if (notifications.length == 0)
          return callback('No notification to set as Read remaining');

        return callback(null, notifications);
      }
    },

    function retrieveUser(notifications, callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user ' + session.uid + ' in user:preferences:read: ' + err);

        if (!user)
          return callback('Unable to retrieve user in user:preferences:read: ' + session.uid);

        return callback(null, notifications, user);
      });
    },

    function markAsViewed(notifications, user, callback) {
      Notifications(that.app).markNotificationsAsViewed(user.id, notifications, function (err, countUpdated) {
        if (err)
          return callback('Error while setting notifications as read for ' + session.uid + ': ' + err);

        return callback(null, notifications, user);
      });
    },

    function prepare(notifications, user, callback) {
      var event = {
        notifications: notifications
      };

      // Count remaining unviewed notifications
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user._id.toString(), function (err, count) {
        if (err)
          logger.error('Error while retrieving notifications: ' + err);

        event.unviewed = count || 0;

        return callback(null, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};

/**
 * Handler user done notifications logic
 * Used to tag selected notifications as "done"
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next step callback
 *
 */
handler.done = function (data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {

      if (!data.id)
        return callback('id parameter is mandatory for notifications:done');

      NotificationModel.findOne({_id: data.id}, function (err, notification) {
        if (err)
          return callback('Error while retrieving notification: ' + err);

        //if (notification.done === true)
        //  return callback('This notification is already tagged as done');

        if (notification.user.toString() !== session.uid)
          return callback('This notification is not associated to this user');

        return callback(null, notification);
      });
    },

    function markAsDone(notification, callback) {
      Notifications(that.app).markNotificationsAsDone(session.uid, [ notification.id ], function (err, countUpdated) {
        if (err)
          return callback('Error while setting notifications as read for ' + session.uid + ': ' + err);

        return callback(null, notification);
      });
    },

    function prepare(notification, callback) {
      var event = {
        notification: notification.id
      };

      return callback(null, event);
    },

    function broadcast(event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'notification:done', event, 'user:'+session.uid, {}, function (err) {
        if (err)
          logger.error('Error while emitting notification:done for uid: ' + session.uid + ': ' + err);
        return callback(null, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};