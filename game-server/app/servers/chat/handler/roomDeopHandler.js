var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room deop logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.deop = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('room:deop require room name param');

			if (!data.username)
				return callback('room:deop require username param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:deop: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:deop: '+data.name);

				if (!room.isOwnerOrOp(session.uid))
					return callback('This user '+session.uid+' isn\'t able to deop another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:deop: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:deop: '+session.uid);

				return callback(null, room, user);
			});
		},

		function retrieveDeopedUser(room, user, callback) {
			User.findByUsername(data.username).exec(function (err, deopedUser) {
				if (err)
					return callback('Error while retrieving deopedUser '+session.uid+' in room:deop: '+err);

				if (!deopedUser)
					return callback('Unable to retrieve deopedUser in room:deop: '+session.uid);

				// Is the targeted user already DEOP of this room
				if (room.op.indexOf(deopedUser._id) === -1)
					return callback('User '+deopedUser.username+' is not OP of '+room.name);

				return callback(null, room, user, deopedUser);
			});
		},

		function persist(room, user, deopedUser, callback) {
			room.update({$pull: { op: deopedUser._id }}, function(err) {
				if (err)
					return callback('Unable to persist deop of '+deopedUser._id.toString()+' on '+room.name);

				return callback(null, room, user, deopedUser);
			});
		},

		function prepareEvent(room, user, deopedUser, callback) {
			var event = {
				by_user_id : user._id.toString(),
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: deopedUser._id.toString(),
				username: deopedUser.username,
				avatar: deopedUser._avatar()
			};

			return callback(null, room, event);
		},

		function historizeAndEmit(room, event, callback) {
			roomEmitter(that.app, room.name, 'room:deop', event, function(err) {
				if (err)
					return callback('Error while emitting room:deop in '+room.name+': '+err);

				return callback(null);
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		log.activity('room:deop', session.uid, data.name+': '+data.username, start);

		next(null, {});
	});

};