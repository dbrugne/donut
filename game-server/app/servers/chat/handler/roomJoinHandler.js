var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomDataHelper = require('../../../util/roomData');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var roomEmitter = require('../../../util/roomEmitter');
var Notifications = require('../../../components/notifications');

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

		function retrieveRoom(user, callback) {
			Room.findByName(data.name)
				.populate('owner', 'username avatar color facebook')
				.exec(function(err, room) {
					if (err)
						return callback('Error while retrieving room in room:join: '+err);

					// Room not found
					if (!room)
						return callback('notexists');

					return callback(null, user, room);
				});
		},

		function checkIfBanned(user, room, callback) {
			if (room.isBanned(user.id))
				return callback('banned', user, room);

			return callback(null, user, room);
		},

		/**
		 * This step happen BEFORE user/room persistence and room subscription
		 * to avoid noisy notifications
		 */
		function sendToUsers(user, room, callback) {
			// Inform room users
			var event = {
				name			: room.name,
				id				: room.id,
				user_id		: user._id.toString(),
				username  : user.username,
				avatar    : user._avatar()
			};
			roomEmitter(that.app, 'room:in', event, function(err, eventData) {
				return callback(err, user, room, eventData);
			});
		},

		function persistOnRoom(user, room, eventData, callback) {
			room.lastjoin_at = Date.now();
			room.users.addToSet(session.uid);
			room.save(function(err) {
				if (err)
					return callback('Error while updating room on room:join: '+err);

				return callback(null, user, room, eventData);
			});
		},

		function joinClients(user, room, eventData, callback) {
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

					return callback(null, user, room, eventData);
				});
			});
		},

		function getWelcomeData(user, room, eventData, callback) {
			roomDataHelper(that.app, user._id.toString(), room, function(err, roomData) {
				if (err)
					return callback(err);

				if (roomData == null)
					return callback('roomDataHelper was unable to return excepted room data: '+room.name);

				return callback(null, user, room, eventData, roomData);
			});
		},

		function sendToUserClients(user, room, eventData, roomData, callback) {
			that.app.globalChannelService.pushMessage('connector', 'room:join', roomData, 'user:'+session.uid, {}, function(err) {
				if (err)
					return callback('Error while sending room:join message to user clients: '+err);

				return callback(null, user, room, eventData, roomData);
			});
		},

		function notification(user, room, eventData, roomData, callback) {
			Notifications(that.app).getType('roomjoin').create(room, eventData.id, callback);
		}

	], function(err) {
		if (err === 'notexists')
			return next(null, {code: 404, err: err});
		if (err === 'banned')
			return next(null, {code: 403, err: err});
		if (err)
			return next(null, {code: 500, err: err});

		return next(null);
	});

};