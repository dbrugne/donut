var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

var Handler = function(app) {
	this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.leave = function(data, session, next) {

	var user = session.__currentUser__;
	var withUser = session.__user__;

	var that = this;

	async.waterfall([

		function check(callback) {
      if (!data.username)
        return callback('username is mandatory');

      if (!withUser)
        return callback('unable to retrieve withUser: ' + data.username);

			return callback(null);
		},

		function persist(callback) {
			user.update({ $pull: { onetoones: withUser._id }}, function(err) {
				return callback(err);
			});
		},

		function sendToUserClients(callback) {
			that.app.globalChannelService.pushMessage('connector', 'user:leave', { username: withUser.username }, 'user:' + user.id, {}, callback);
		}

	], function(err) {
    if (err) {
      logger.error('[user:join] ' + err);
      return next(null, { code: 500, err: err });
    }

		return next(null);
	});

};