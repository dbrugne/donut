var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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
 * Handle room users logic. Return a qualified list of users in the given room.
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.users = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback("room:users 'name' is mandatory");
			if (!Room.validateName(data.name))
				return callback('room:users Invalid room name: '+data.name);

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name, 'name')
				.populate('users', 'username avatar color facebook')
				.exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:users: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:users: '+data.name);

				var users = [];
				_.each(room.users, function(user) {
					users.push({
						user_id   : user._id.toString(),
						username  : user.username,
						avatar    : user._avatar()
					});
				});

				return callback(null, room, users);
			});
		},

		function checkHeIsIn(room, users, callback) {
			// Test if the current user is in room
			var userIds = _.map(room.users, function(u) {
				return u._id.toString();
			});
			if (userIds.indexOf(session.uid) === -1)
				return callback('room:users, this user '+session.uid+' is not currently in room '+room.name);

			return callback(null, room, users);
		},

		function status(room, users, callback) {
			var uids = _.map(users, function(u) { return u.user_id; });
			that.app.statusService.getStatusByUids(uids, function(err, results) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				_.each(users, function(element, index, list) {
					list[index].status = (results[element.user_id])
							? 'online'
							: 'offline';
				});

				return callback(null, room, users);
			});
		},

		function prepare(room, users, callback) {
			var event = {
				name: room.name,
				id: room.id,
				users: users
			};
			return callback(null, event);
		}

	], function(err, event) {
		if (err)
			return next(null, {code: 500, err: err});

		return next(null, event);
	});

};