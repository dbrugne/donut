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
 * Handle room message logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.op = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return helper.handleError('room:op require room name param');

			if (!data.username)
				return helper.handleError('room:op require username param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:op: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:op: '+data.name);

				if (!room.isOwnerOrOp(session.uid))
					return callback('This user '+session.uid+' isn\'t able to op another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:op: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:op: '+session.uid);

				return callback(null, room, user);
			});
		},

		function retrieveOpedUser(room, user, callback) {
			User.findByUsername(data.username).exec(function (err, opedUser) {
				if (err)
					return callback('Error while retrieving opedUser '+session.uid+' in room:op: '+err);

				if (!opedUser)
					return callback('Unable to retrieve opedUser in room:op: '+session.uid);

				// Is the targeted user already OP of this room
				if (room.op.indexOf(opedUser._id) !== -1)
					return callback('User '+opedUser.username+' is already OP of '+room.name);

				return callback(null, room, user, opedUser);
			});
		},

		function persist(room, user, opedUser, callback) {
			room.update({$addToSet: { op: opedUser._id }}, function(err) {
				if (err)
					return callback('Unable to persist op of '+opedUser._id.toString()+' on '+room.name);

				return callback(null, room, user, opedUser);
			});
		},

		function prepareEvent(room, user, opedUser, callback) {
			var event = {
				by_user_id : user._id.toString(),
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: opedUser._id.toString(),
				username: opedUser.username,
				avatar: opedUser._avatar()
			};

			return callback(null, room, event);
		},

		function historizeAndEmit(room, event, callback) {
			roomEmitter(that.app, room.name, 'room:op', event, function(err) {
				if (err)
					return callback('Error while emitting room:op in '+room.name+': '+err);

				return callback(null);
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		log.activity('room:op', session.uid, data.name+': '+data.username, start);

		next(null, {});
	});

};