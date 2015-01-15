var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var _ = require('underscore');
var oneDataHelper = require('../../../util/oneData');
var User = require('../../../../../shared/models/user');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle the user "joins" a onetoone action
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.join = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('username is mandatory for user:join');

			if (!User.validateUsername(data.username))
				return callback('Invalid user username on user:join: '+data.username);

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:join: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:join: '+session.uid);

				return callback(null, user);
			});
		},

		function getWelcomeData(user, callback) {
			oneDataHelper(that.app, session.uid, data.username, {}, function(err, oneData) {
				if (err)
					return callback(err);

				// user:join was called with an unknown username
				if (oneData == null)
					return callback('oneDataHelper was unable to return excepted onetoone data: '+data.username);

				return callback(null, user, oneData);
			});
		},

		function persist(user, oneData, callback) {
			// persist on user (requester only)
			user.update({$addToSet: { onetoones: oneData.user_id }}, function(err) {
				if (err)
					return callback('Unable to persist ($addToSet) onetoones on user: '+err);

				return callback(null, user, oneData);
			});
		},

  	function sendToUserClients(user, oneData, callback) {
			that.app.globalChannelService.pushMessage('connector', 'user:join', oneData, 'user:'+session.uid, {}, function(err) {
				if (err)
					return callback('Error while sending user:join message to user clients: '+err);

				return callback(null, user, oneData);
			});
		}

	], function(err, user, oneData) {
		if (err)
			return next(null, {code: 500, err: err});

		log.activity('user:join', session.uid, data.username, start);

		return next(null);
	});

};