var debug = require('debug')('donut:server:disconnectRemote');
var async = require('async');
var User = require('../../../../../server/app/models/user');

var GLOBAL_CHANNEL_NAME = 'global';

module.exports = function(app) {
	return new DisconnectRemote(app);
};

var DisconnectRemote = function(app) {
	this.app = app;
};

/**
 * Handle "socket" dicconnection logic
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

				debug('IMPORTANT !!! disconnect lastsocket: ', lastSocket);

				return callback(null, lastSocket);
			});
		},

		function retrieveUser(lastSocket, callback){
			var q = User.findById(uid);
			q.exec(function(err, user) {
				if (err)
					return callback('Unable to find user: '+err, null);

				return callback(null, user, lastSocket);
			});
		},

		// @todo
		function unsubscribeUserInRoomChannels(user, lastSocket, callback) {
			if (user.rooms.length < 1 && !lastSocket)
				return callback(null, user, lastSocket);

			var parallels = [];
			_.each(user.rooms, function(name) {
				parallels.push(function(fn) {
					that.app.globalChannelService.leave(name, uid, frontendId, function(err) {
						if (err)
							return fn('Error while unregistering user from room channel: '+err);

						return fn(null, name);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while unregistering user from rooms channels: '+err);

				return callback(null, user, lastSocket);
			});
		},

		function unsubscribeUserFromGlobalChannel(user, lastSocket, callback) {
			if (!lastSocket)
			  return callback(null, user, lastSocket);

			that.app.globalChannelService.leave(GLOBAL_CHANNEL_NAME, uid, frontendId, function(err) {
				if (err)
					return callback('Error while registering user in global channel: '+err);

				return callback(null, user, lastSocket);
			});
		},

		function pushOffline(user, lastSocket, callback) {
			if (!lastSocket)
			  return callback(null, user, lastSocket);

			// don't wait for response before continuing
			that.app.rpc.chat.statusRemote.goesOffline(
				{uid: uid}, // emulate session for app.js/chatRoute.dispatch
				uid,
				function(err) {
					if (err)
						debug('Error while disconnecting user: '+err);
				}
			);

			return callback(null, user, lastSocket);
		}

	], function (err, user, lastSocket) {
		if (err)
			return globalCallback(err);

		// @todo : reactivate logs
		//logger.log('disconnect', socket.getUsername(), '', start);

		debug('disconnected '+uid+'@'+frontendId);
		return globalCallback(null);
	});

};
