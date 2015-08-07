var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var oneEmitter = require('../../../util/oneEmitter');

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

  var user = session.__currentUser__;
  var bannedUser = session.__user__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('require username param');

      if (!user)
        return callback('unable to retrieve user: ' + session.uid);

      if (!bannedUser)
        return callback('unable to retrieve bannedUser: ' + data.username);

      if (user.isBanned(bannedUser.id))
        return callback('this user ' + bannedUser.username + ' is already banned');

			return callback(null);
		},

		function persist(callback) {
			var ban = {
				user: bannedUser._id,
				banned_at: new Date()
			};
			user.update({$addToSet: { bans: ban }}, function(err) {
				return callback(err);
			});
		},

		function historizeAndEmit(callback) {
      var event = {
        by_user_id  : user.id,
        by_username : user.username,
        by_avatar   : user._avatar(),
        user_id     : bannedUser.id,
        username    : bannedUser.username,
        avatar      : bannedUser._avatar()
      };
			oneEmitter(that.app, { from: user._id, to: bannedUser._id }, 'user:ban', event, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[user:ban] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};