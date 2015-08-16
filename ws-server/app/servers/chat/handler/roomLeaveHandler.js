var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.leave = function(data, session, next) {

	var user = session.__currentUser__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory');

      if (!room)
        return callback('unable to retrieve room: ' + data.name);

			return callback(null);
		},

		function persist(callback) {
			room.update({ $pull: { users: user.id }}, function(err) {
        return callback(err);
			});
		},

		function leaveClients(callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(user.id, function(err, sids) {
				if (err)
					return callback(err);

				if (!sids || sids.length < 1)
          return callback('no connector sessions for current user (probably a problem somewhere)');

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, user.id, sid, function(err) {
							if (err)
								return fn(sid + ': ' + err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err) {
					return callback(err);
				});
			});
		},

		function sendToUserClients(callback) {
			that.app.globalChannelService.pushMessage('connector', 'room:leave', { name: room.name, id: room.id }, 'user:' + user.id, {}, function(err) {
        return callback(err);
      });
		},

		/**
		 * This step happen AFTER user/room persistence and room subscription
		 * to avoid noisy notifications
		 */
		function sendToUsers(callback) {
			var event = {
				name			: room.name,
				id				: room.id,
				user_id		: user.id,
				username	: user.username,
				avatar		: user._avatar()
			};
			roomEmitter(that.app, 'room:out', event, callback);
		}

	], function(err) {
		if (err)
			logger.error('[room:leave] ' + err);

		return next(null);
	});

};