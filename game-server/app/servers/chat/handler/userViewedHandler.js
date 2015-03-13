var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var HistoryOne = require('../../../../../shared/models/historyone');
var pattern = new RegExp("^[0-9a-fA-F]{24}$");

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

			if (!data.events || !_.isArray(data.events))
				return callback('events parameter is mandatory for user:viewed');

			data.events = _.filter(data.events, function(id) {
				// http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
				return pattern.test(id);
			});
			if (!data.events.length)
				return callback('events parameter should contains at least one valid event ID in user:viewed');

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
			HistoryOne.update({
				_id: {$in: data.events},
				event: 'user:message',
				to: user._id
			}, {
				$set: {viewed: true}
			}, {
				multi: true
			}, function(err) {
				return callback(err, user, withUser);
			});
		},

		function sendToUserSockets(user, withUser, callback) {
			var viewedEvent = {
				username: withUser.username,
				events: data.events
			};
			that.app.globalChannelService.pushMessage('connector', 'user:viewed', viewedEvent, 'user:'+session.uid, {}, function(err) {
				return callback(err, user, withUser);
			});
		}

	], function(err) {
		if (err)
			logger.error(err);

		next(err);
	});

};