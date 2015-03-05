var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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
 * Handle ones history viewing logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.viewed = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('username parameter is mandatory for user:viewed');

			if (!data.event)
				return callback('event parameter is mandatory for user:viewed');

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:viewed: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:viewed: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveWithUser(user, callback) {
			User.findByUsername(data.username).exec(function (err, withUser) {
				if (err)
					return callback('Error while retrieving user '+data.username+' in user:viewed: '+err);

				if (!withUser)
					return callback('Unable to retrieve user in user:viewed: '+data.username);

				return callback(null, user, withUser);
			});
		},

		function persist(user, withUser, callback) {
			var subDocument = null;

			// find an existing sub document
			if (user.onetoones_viewed) {
				subDocument = _.find(user.onetoones_viewed, function(sub) {
					if (sub.user.toString() != withUser._id.toString())
					  return false;

					sub.event = data.event;
					sub.time = Date.now();
					return true;
				});
			}

			// create a new subdocument
			if (!subDocument) {
			  subDocument = {
					user: withUser._id,
					event: data.event
				};
				user.onetoones_viewed.push(subDocument);
			}

			user.save(function(err) {
				if (err)
				  return callback(err);

				return callback(err, user, withUser);
			});
		},

		function sendToUserSockets(user, withUser, callback) {
			var viewedEvent = {
				username: withUser.username,
				event: data.event
			};
			that.app.globalChannelService.pushMessage('connector', 'user:viewed', viewedEvent, 'user:'+session.uid, {}, function(err) {
				if (err)
					return callback('Error while sending user:viewed message to user clients: '+err);

				return callback(null, user, withUser);
			});
		}

	], function(err, user, withUser) {
		if (err)
			logger.error(err);

		next(err);
	});

};