var async = require('async');
var _ = require('underscore');
var roomDataHelper = require('../../../util/roomData');
var User = require('../../../../../server/app/models/user');
var Room = require('../../../../../server/app/models/room');
var conf = require('../../../../../server/config/index');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle the user "joins" a room action
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.join = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory for room:join');

			if (!Room.validateName(data.name))
				return callback('Invalid room name on room:join: '+data.name);

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:join: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:join: '+session.uid);

				return callback(null, user);
			});
		},

		function findOrCreateRoom(user, callback) {
			var q = Room.findByName(data.name);
			q.exec(function(err, room) {
				if (err)
					return callback('Error while retrieving room in room:join: '+err);

				// Found an existing one
				if (room)
					return callback(null, user, room);

				// Create a new one
				room = new Room({
					name: data.name,
					owner: user._id.toString(),
					color: conf.room.default.color
				});
				room.save(function (err, room) {
					if (err)
						return callback('Error while creating room: '+err);

					// @todo : restore logs
					//logger.log('room:create', user.username, data.name);
					return callback(null, user, room);
				});
			});
		},

		/**
		 * This step happen BEFORE user/room persistence and room subscription
		 * to avoid noisy notifications
		 */
		function sendToUsers(user, room, callback) {
			// Inform room users
			var event = {
				user_id: user._id.toString(),
				username: user.username,
				avatar: user._avatar(), // @todo : avatar could be outdated
				color: user.color  // @todo : color could be outdated
			};
			roomEmitter(that.app, room.name, 'room:in', event, function(err) {
				return callback(err, user, room);
			});
		},

		function persistOnRoom(user, room, callback) {
			room.lastjoin_at = Date.now();
			room.users.addToSet(session.uid);
			room.save(function(err) {
				if (err)
					return callback('Error while updating room on room:join: '+err);

				return callback(null, user, room);
			});
		},

		function persistOnUser(user, room, callback) {
			// persist on user
			user.update({$addToSet: { rooms: room.name }}, function(err) {
				if (err)
					return callback('Unable to persist ($addToSet) rooms on user: '+err);

				return callback(null, user, room);
			});
		},

		function joinClients(user, room, callback) {
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
						that.app.globalChannelService.add(room.name, session.uid, sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('Error while subscribing user '+session.uid+' in '+room.name+': '+err);

					return callback(null, user, room, sids);
				});
			});
		},

		function getWelcomeData(user, room, sids, callback) {
			roomDataHelper(that.app, user._id.toString(), room.name, function(err, roomData) {
				if (err)
					return callback(err);

				if (roomData == null)
					return callback('roomDataHelper was unable to return excepted room data: '+room.name);

				return callback(null, user, room, sids, roomData);
			});
		},

		function sendToUserClients(user, room, sids, roomData, callback) {
			var uids = [];
			_.each(sids, function(sid) {
				uids.push({
					uid: session.uid,
					sid: sid
				});
			});
			that.app.channelService.pushMessageByUids('room:join', roomData, uids, {}, function(err) {
				if (err)
				  return callback('Error while forwarding room:join message to user clients: '+err);

				return callback(null, user, room, sids, roomData);
			});
		}

	], function(err, user, room, sids, roomData) {
		if (err)
			return next(null, {code: 500, err: err});

		// @todo : restore logs

		return next(null, {});
	});

};