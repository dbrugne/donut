var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle the user "leaves" a onetoone action
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.leave = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('username is mandatory for user:leave');

			if (!User.validateUsername(data.username))
				return callback('Invalid user username on user:leave: '+data.username);

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:leave: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:leave: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveUserWith(user, callback) {
			User.findByUsername(data.username).exec(function (err, userWith) {
				if (err)
					return callback('Error while retrieving user '+data.username+' in user:leave: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:leave: '+data.username);

				return callback(null, user, userWith);
			});
		},

		function persistOnUser(user, userWith, callback) {
			user.update({$pull: { onetoones: userWith._id }}, function(err) {
				if (err)
					return callback('Unable to persist ($pull) onetoone on user: '+err);

				return callback(null, user, userWith);
			});
		},

		function sendToUserClients(user, userWith, callback) {
			that.app.globalChannelService.pushMessage('connector', 'user:leave', {username: userWith.username}, 'user:'+session.uid, {}, function(err) {
				if (err)
					return callback('Error while sending user:leave message to user clients: '+err);

				return callback(null, user, userWith);
			});
		}

	], function(err, user, userWith) {
		if (err)
			logger.error(err);

		return next(null);
	});

};