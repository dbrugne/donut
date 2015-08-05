var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var retriever = require('../../../../../shared/models/historyone').retrieve();
var User = require('../../../../../shared/models/user');
var common = require('donut-common');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle user history logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.history = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('username is mandatory for user:history');

			if (!common.validateUsername(data.username))
				return callback('Invalid user username on user:history: '+data.username);

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUsername(data.username).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+data.username+' in user:read: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:read: '+data.username);

				return callback(null, user);
			});
		},

		function history(user, callback) {
			var options = {
				since: data.since,
				limit: data.limit
			};
			retriever(session.uid, user._id, options, function(err, history) {
				if (err)
					return callback(err);

				var historyEvent = {
					username  : user.username,
					history   : history.history,
					more      : history.more
				};
				return callback(null, user, historyEvent);
			});
		},

	], function(err, user, historyEvent) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, historyEvent);
	});

};