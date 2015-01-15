var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');


module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Description
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.read = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback("room:read 'name' is mandatory");
			if (!Room.validateName(data.name))
				return callback('room:read Invalid room name: '+data.name);

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name)
				.populate('owner', 'username avatar color facebook')
				.populate('op', 'username avatar color facebook')
				.populate('users', 'username avatar color facebook')
				.exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:read: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:read: '+data.name);

				return callback(null, room);
			});
		},

		function prepareData(room, callback) {
			// owner
			var owner = {};
			if (room.owner) {
				owner = {
					user_id: room.owner._id,
					username: room.owner.username,
					avatar: room.owner._avatar()
				};
			}

			// op
			var ops = [];
			if (room.op && room.op.length > 0) {
				_.each(room.op, function(op) {
					ops.push({
						user_id: op._id.toString(),
						username: op.username,
						avatar: op._avatar()
					});
				});
			}

			// users
			var users = [];
			if (room.users && room.users.length > 0) {
				_.each(room.users, function(u) {
					users.push({
						user_id: u._id.toString(),
						username: u.username,
						avatar: u._avatar()
					});
				});
			}

			var roomData = {
				name: room.name,
				owner: owner,
				op: ops,
				users: users,
				avatar: room._avatar(),
				poster: room._poster(),
				color: room.color,
				website: room.website,
				topic: room.topic,
				description: room.description,
				created: room.created_at
			};

			return callback(null, room, roomData);
		},

	], function(err, user, roomData) {
		if (err)
			return next(null, {code: 500, err: err});

		log.activity('room:read', session.uid, data.name, start);

		return next(null, roomData);
	});

};