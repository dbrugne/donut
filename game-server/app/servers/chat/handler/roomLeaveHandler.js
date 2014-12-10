var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle the user "leaves" a room action
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.leave = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory for room:leave');

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:leave: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:leave: '+session.uid);

				return callback(null, user);
			});
		},

		function retrieveRoom(user, callback) {
			var q = Room.findByName(data.name);
			q.exec(function(err, room) {
				if (err)
					return callback('Error while retrieving room in room:leave: '+err);

				return callback(null, user, room);
			});
		},

		function persistOnRoom(user, room, callback) {
			room.update({$pull: { users: session.uid }}, function(err) {
				if (err)
					return callback('Unable to persist ($pull) users on room: '+err);

				return callback(null, user, room);
			});
		},

		function persistOnUser(user, room, callback) {
			user.update({$pull: { rooms: room.name }}, function(err) {
				if (err)
					return callback('Unable to persist ($pull) rooms on user: '+err);

				return callback(null, user, room);
			});
		},

		function leaveClients(user, room, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(session.uid, function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (!sids || sids.length < 1) {
					return callback('Error while retrieving user sessions frontends list: '+err);
				}

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, session.uid, sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('Error while unsubscribing user '+session.uid+' from '+room.name+': '+err);

					return callback(null, user, room, sids);
				});
			});
		},

		function sendToUserClients(user, room, sids, callback) {
			var uids = [];
			_.each(sids, function(sid) {
				uids.push({
					uid: session.uid,
					sid: sid
				});
			});
			that.app.channelService.pushMessageByUids('room:leave', {name: room.name}, uids, {}, function(err) {
				if (err)
					return callback('Error while forwarding room:leave message to user clients: '+err);

				return callback(null, user, room, sids);
			});
		},

		/**
		 * This step happen AFTER user/room persistence and room subscription
		 * to avoid noisy notifications
		 */
		function sendToUsers(user, room, sids, callback) {
			var event = {
				user_id: user._id.toString(),
				username: user.username,
				avatar: user._avatar(), // @todo : avatar could be outdated
				color: user.color  // @todo : color could be outdated
			};
			roomEmitter(that.app, room.name, 'room:out', event, function(err) {
				return callback(err, user, room);
			});
		}

	], function(err, user, room) {
		if (err)
			debug(err);

		// @todo : restore logs

		return next(null);
	});

};