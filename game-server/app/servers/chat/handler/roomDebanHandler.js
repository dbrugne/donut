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
 * Handle room deban logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.deban = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('room:deban require room name param');

			if (!data.username)
				return callback('room:deban require username param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:deban: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:deban: '+data.name);

				if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
					return callback('This user '+session.uid+' isn\'t able to deban another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:deban: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:deban: '+session.uid);

				return callback(null, room, user);
			});
		},

		function retrieveunbannedUser(room, user, callback) {
			User.findByUsername(data.username).exec(function (err, unbannedUser) {
				if (err)
					return callback('Error while retrieving unbannedUser '+session.uid+' in room:deban: '+err);

				if (!unbannedUser)
					return callback('Unable to retrieve unbannedUser in room:deban: '+session.uid);

				return callback(null, room, user, unbannedUser);
			});
		},

		function persist(room, user, unbannedUser, callback) {
			if (!room.bans || !room.bans.length)
				return callback('There is no user banned from this room');

			if (!room.isBanned(unbannedUser.id))
				return callback('This user '+unbannedUser.username+' is not banned from '+room.name);

			room.bans.id(subDocument._id).remove();
			room.save(function(err) {
				if (err)
					return callback('Unable to persist deban of '+unbannedUser.username+' on '+room.name);

				return callback(null, room, user, unbannedUser);
			});
		},

		function prepareEvent(room, user, unbannedUser, callback) {
			var event = {
				by_user_id : user._id.toString(),
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: unbannedUser._id.toString(),
				username: unbannedUser.username,
				avatar: unbannedUser._avatar()
			};

			return callback(null, room, user, unbannedUser, event);
		},

		function historizeAndEmit(room, user, unbannedUser, event, callback) {
			roomEmitter(that.app, room.name, 'room:deban', event, function(err, sentEvent) {
				if (err)
					return callback('Error while emitting room:deban in '+room.name+': '+err);

				return callback(null, room, user, unbannedUser, sentEvent);
			});
		},

		function notification(room, user, unbannedUser, event, callback) {
			Notifications(that.app).create('roomdeban', unbannedUser, {room: room, event: event}, function() {
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