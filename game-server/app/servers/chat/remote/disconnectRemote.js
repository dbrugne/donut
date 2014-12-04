var debug = require('debug')('donut:server:DisconnectRemote');
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../server/config/index');
var User = require('../../../../../server/app/models/user');
var Room = require('../../../../../server/app/models/room');

var GLOBAL_CHANNEL_NAME = 'global';

module.exports = function(app) {
	return new DisconnectRemote(app);
};

var DisconnectRemote = function(app) {
	this.app = app;
};

/**
 * Handle new "socket" connection logic:
 * - handle default room (#donut) auto-join logic
 * - set lastonline_at on user
 * - register uid@frontendId in joined room "global channels"
 * - register uid@frontendId in global "global channels"
 * - generate and pass to callback welcome message
 *
 * @param {String} uid unique id for user
 * @param {String} frontendId server id
 *
 */
DisconnectRemote.prototype.disconnect = function(uid, frontendId, globalCallback) {

	debug('disconnect '+uid+'@'+frontendId);

	var that = this;

	async.waterfall([

		function isLastSocket(callback) {
			that.app.statusService.getStatusByUid(uid, function(err, status) {
				if (err)
					return debug('Error while retrieving user status: '+err);

				// At least an other socket is live for this user or not
				var lastSocket = !status;

				return callback(null, lastSocket);
			});
		},

		function retrieveUser(callback, lastSocket){
			var q = User.findById(uid);
			q.exec(function(err, user) {
				if (err)
					return callback('Unable to find user: '+err, null);

				return callback(null, user, lastSocket);
			});
		},

		function persistOffliness(user, lastSocket, callback) {
			if (!lastSocket)
				return callback(null, user, lastSocket);

			user.set('lastoffline_at', Date.now());
			user.set('online', false);
			user.save(function(err) {
				if (err)
					return callback('Error while updating user offliness: '+err);

				return callback(null, user, lastSocket)
			});
		},

	], function (err, user) {
		if (err)
			return globalCallback(err);

		// @todo : reactivate logs
		//logger.log('disconnect', socket.getUsername(), '', start);

		debug('disconnected '+uid+'@'+frontendId);
		return globalCallback(null);
	});

};
