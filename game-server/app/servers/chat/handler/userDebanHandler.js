var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');
var oneEmitter = require('../../../util/oneEmitter');
var inputUtil = require('../../../util/input');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle user deban logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.ban = function(data, session, next) {

	var that = this;

	var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : false;

	async.waterfall([

		function check(callback) {
			if (!data.uid)
				return callback('user:deban require uid param');

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:deban: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:deban: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveUnbannedUser(user, callback) {
			User.findByUid(data.uid).exec(function (err, unbannedUser) {
				if (err)
					return callback('Error while retrieving unbannedUser '+data.uid+' in user:deban: '+err);

				if (!unbannedUser)
					return callback('Unable to retrieve unbannedUser in user:deban: '+data.uid);

				return callback(null, user, unbannedUser);
			});
		},

		function checkIfAlreadyUnbanned(user, unbannedUser, callback) {
			if (!user.isBanned(unbannedUser.id))
				return callback('This user '+unbannedUser.username+' is not banned');

			return callback(null, user, unbannedUser);
		},

		function persistOnUser(user, unbannedUser, callback) {
			var subDocument = _.find(user.bans, function(ban) {
				if (ban.user.toString() == unbannedUser._id.toString())
					return true;
			});

			user.bans.id(subDocument._id).remove();

			user.save(function(err) {
				if (err)
					return callback('Unable to persist deban of '+unbannedUser.username+' on '+user.username);

				return callback(null, user, unbannedUser);
			});
		},

		function prepareEvent(user, unbannedUser, callback) {
			var event = {
				by_user_id : user.id,
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: unbannedUser.id,
				username: unbannedUser.username,
				avatar: unbannedUser._avatar(),
        // probably, could be cleaner
        from_user_id  : user.id,
        from_username : user.username,
        from_avatar   : user._avatar(),
        to_user_id    : unbannedUser.id,
        to_username   : unbannedUser.username
			};

			return callback(null, user, unbannedUser, event);
		},

		function historizeAndEmit(user, unbannedUser, event, callback) {
			oneEmitter(that.app, {from: user.id, to: unbannedUser.id}, 'user:deban', event, function(err, event) {
				if (err)
					return callback(err);

				return callback(null, user, unbannedUser, event);
			});
		},

		function notification(user, unbannedUser, event, callback) {
			Notifications(that.app).create('userdeban', unbannedUser, {event: event}, function() {
				return callback(null);
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};