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
 * Handle user ban logic
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
				return callback('user:ban require uid param');

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:ban: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:ban: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveBannedUser(user, callback) {
			User.findByUid(data.uid).exec(function (err, bannedUser) {
				if (err)
					return callback('Error while retrieving bannedUser '+data.uid+' in user:ban: '+err);

				if (!bannedUser)
					return callback('Unable to retrieve bannedUser in user:ban: '+data.uid);

				return callback(null, user, bannedUser);
			});
		},

		function checkIfAlreadyBanned(user, bannedUser, callback) {
			if (user.isBanned(bannedUser.id))
				return callback('This user '+bannedUser.username+' is already banned');

			return callback(null, user, bannedUser);
		},

		function persistOnUser(user, bannedUser, callback) {
			var ban = {
				user: bannedUser._id,
				banned_at: new Date()
			};
			if (reason !== false)
				ban.reason = reason;

			user.update({$addToSet: { bans: ban }}, function(err) {
				if (err)
					return callback('Unable to persist ban of '+bannedUser.username);

				return callback(null, user, bannedUser);
			});
		},

		function prepareEvent(user, bannedUser, callback) {
			var event = {
				by_user_id : user.id,
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: bannedUser.id,
				username: bannedUser.username,
				avatar: bannedUser._avatar(),
        // probably, could be cleaner
        from_user_id  : user.id,
        from_username : user.username,
        from_avatar   : user._avatar(),
        to_user_id    : bannedUser.id,
        to_username   : bannedUser.username
			};

			if (reason !== false)
				event.reason = reason;

			return callback(null, user, bannedUser, event);
		},

		function historizeAndEmit(user, bannedUser, event, callback) {
			oneEmitter(that.app, {from: user._id, to: bannedUser._id}, 'user:ban', event, function(err, event) {
				if (err)
					return callback(err);

				return callback(null, user, bannedUser, event);
			});
		}
		//,
        //
		//function notification(user, bannedUser, event, callback) {
		//	Notifications(that.app).create('userban', bannedUser, {event: event}, function() {
		//		return callback(null);
		//	});
		//}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};