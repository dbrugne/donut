var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room ban logic
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
			if (!data.name)
				return callback('room:ban require room name param');

			if (!data.username)
				return callback('room:ban require username param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:ban: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:ban: '+data.name);

				if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
					return callback('This user '+session.uid+' isn\'t able to ban another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:ban: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:ban: '+session.uid);

				return callback(null, room, user);
			});
		},

		function retrieveBannedUser(room, user, callback) {
			User.findByUsername(data.username).exec(function (err, bannedUser) {
				if (err)
					return callback('Error while retrieving bannedUser '+session.uid+' in room:ban: '+err);

				if (!bannedUser)
					return callback('Unable to retrieve bannedUser in room:ban: '+session.uid);

				// Is the targeted user is the owner
				if (room.owner.toString() == bannedUser._id.toString())
					return callback('User '+bannedUser.username+' is owner of '+room.name);

				return callback(null, room, user, bannedUser);
			});
		},

		function checkIfAlreadyBanned(room, user, bannedUser, callback) {
			if (room.isBanned(bannedUser.id))
				return callback('This user '+bannedUser.username+' is already banned from '+room.name);

			return callback(null, room, user, bannedUser);
		},

		function persistOnRoom(room, user, bannedUser, callback) {
			var ban = {
				user: bannedUser._id,
				banned_at: new Date()
			};
			if (reason !== false)
				ban.reason = reason;

			room.update({$addToSet: { bans: ban }, $pull: { users: bannedUser._id, op: bannedUser._id }}, function(err) {
				if (err)
					return callback('Unable to persist ban of '+bannedUser.username+' on '+room.name);

				return callback(null, room, user, bannedUser);
			});
		},

		function prepareEvent(room, user, bannedUser, callback) {
			var event = {
				name			 : room.name,
				id				 : room.id,
				by_user_id : user._id.toString(),
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: bannedUser._id.toString(),
				username: bannedUser.username,
				avatar: bannedUser._avatar()
			};

			if (reason !== false)
				event.reason = reason;

			return callback(null, room, user, bannedUser, event);
		},

		function historizeAndEmit(room, user, bannedUser, event, callback) {
			roomEmitter(that.app, 'room:ban', event, function(err, sentEvent) {
				if (err)
					return callback('Error while emitting room:ban in '+room.name+': '+err);

				return callback(null, room, user, bannedUser, sentEvent);
			});
		},

		/**
		 * /!\ .unsubscribeClients come after .historizeAndEmit to allow banned user to receive message
		 */
		function unsubscribeClients(room, user, bannedUser, event, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(bannedUser._id.toString(), function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (!sids || sids.length < 1) {
					return callback(null, room, user, bannedUser, event); // the targeted user could be offline at this time
				}

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, bannedUser._id.toString(), sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('Error while unsubscribing user '+bannedUser._id.toString()+' from '+room.name+': '+err);

					return callback(null, room, user, bannedUser, event);
				});
			});
		},

		function notification(room, user, bannedUser, event, callback) {
			Notifications(that.app).getType('roomban').create(bannedUser, room,  event.id, callback);
		}

	], function(err, bannedUser) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};