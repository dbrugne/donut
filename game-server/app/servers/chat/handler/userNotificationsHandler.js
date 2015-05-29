var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
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
handler.read = function(data, session, next) {

	var that = this;

	async.waterfall([

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:preferences:read: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:preferences:read: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveNotifications(user, callback) {
			Notifications(that.app).retrieveUserNotifications(user._id.toString(), data.number, function(err, notifications) {
				if (err)
					return callback('Error while retrieving notifications for '+session.uid+': '+err);

				return callback(null, user, notifications);
			});
		},

		function prepare(user, notifications, callback) {
			var event = {
                notifications: []
            };
			_.each(notifications, function(notification) {
				var d = {
					type:   notification.type,
					time:   notification.time,
					viewed: notification.viewed,
					data:   notification.data
				};

                if (d.data.user)
                    d.data.user = {
                        id: d.data.user.id,
                        username: d.data.user.username,
                        color: d.data.user.color,
                        avatar: d.data.user._avatar()
                    };

				if (d.data.by_user)
                    d.data.by_user = {
                      id: d.data.by_user.id,
                      username: d.data.by_user.username,
                      color: d.data.by_user.color,
                      avatar: d.data.by_user._avatar()
                    };

				event.notifications.push(d);
			});

			return callback(null, event);
		}

	], function(err, event) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, event);
	});

};

//handler.viewed = function(data, session, next) {};