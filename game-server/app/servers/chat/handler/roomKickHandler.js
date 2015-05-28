var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room kick logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.kick = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('room:kick require room name param');

			if (!data.username)
				return callback('room:kick require username param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:kick: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:kick: '+data.name);

				if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
					return callback('This user '+session.uid+' isn\'t able to kick another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:kick: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:kick: '+session.uid);

				return callback(null, room, user);
			});
		},

		function retrieveKickedUser(room, user, callback) {
			User.findByUsername(data.username).exec(function (err, kickedUser) {
				if (err)
					return callback('Error while retrieving kickedUser '+session.uid+' in room:kick: '+err);

				if (!kickedUser)
					return callback('Unable to retrieve kickedUser in room:kick: '+session.uid);

				// Is the targeted user is the owner
				if (room.owner.toString() == kickedUser._id.toString())
					return callback('User '+kickedUser.username+' is owner of '+room.name);

				// Targeted user should be in room
				if (room.users.indexOf(kickedUser._id.toString()) === -1)
					return callback('Can\'t kick user '+user.username+' that is not actually in the room: '+data.name);

				return callback(null, room, user, kickedUser);
			});
		},

		function persistOnRoom(room, user, kickedUser, callback) {
			room.update({$pull: { users: kickedUser._id }}, function(err) {
				if (err)
					return callback('Unable to persist kick of '+kickedUser._id.toString()+' on '+room.name);

				return callback(null, room, user, kickedUser);
			});
		},

		function persistOnUser(room, user, kickedUser, callback) {
			kickedUser.update({$pull: { rooms: room.name }}, function(err) {
				if (err)
					return callback('Unable to persist kick from '+room.name+' of '+kickedUser._id.toString());

				return callback(null, room, user, kickedUser);
			});
		},

		function prepareEvent(room, user, kickedUser, callback) {
			var event = {
				by_user_id : user._id.toString(),
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: kickedUser._id.toString(),
				username: kickedUser.username,
				avatar: kickedUser._avatar()
			};

			if (data.reason)
				event.reason = data.reason;

			return callback(null, room, user, kickedUser, event);
		},

		function historizeAndEmit(room, user, kickedUser, event, callback) {
			roomEmitter(that.app, room.name, 'room:kick', event, function(err, sentEvent) {
				if (err)
					return callback('Error while emitting room:kick in '+room.name+': '+err);

				return callback(null, room, user, kickedUser, sentEvent);
			});
		},

		/**
		 * /!\ .unsubscribeClients come after .historizeAndEmit to allow kicked user to receive message
		 */
		function unsubscribeClients(room, user, kickedUser, sentEvent, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(kickedUser._id.toString(), function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (!sids || sids.length < 1) {
					return callback(null, room, user, kickedUser, sentEvent); // the targeted user could be offline at this time
				}

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, kickedUser._id.toString(), sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('Error while unsubscribing user '+kickedUser._id.toString()+' from '+room.name+': '+err);

					return callback(null, room, user, kickedUser, sentEvent);
				});
			});
		},

		function notification(room, user, kickedUser, sentEvent, callback) {
			console.log('bien sale');
			Notifications(that.app).create('roomkick', kickedUser, {room: room, event: sentEvent}, function() {
				console.log('bien sale 2');
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