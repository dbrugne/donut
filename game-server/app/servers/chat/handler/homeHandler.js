var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
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
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.home = function(msg, session, next) {

	var homeEvent = {};

	async.waterfall([

			function rooms(callback) {

				var q = Room.find({})
					.sort({priority: -1, 'lastjoin_at': -1})
					.limit(100)
					.populate('owner', 'username avatar');

				q.exec(function (err, rooms) {
					if (err)
						return callback('Error while retrieving home rooms: ' + err);

					var _rooms = [];
					_.each(rooms, function (room) {
						var _owner = {};
						if (room.owner != undefined) {
							_owner = {
								user_id : room.owner._id.toString(),
								username: room.owner.username
							};
						}

						var count = (room.users)
							? room.users.length
							: 0;

						var _data = {
							name       : room.name,
							topic      : room.topic,
							description: room.description,
							color      : room.color,
							avatar     : room.avatar,
							owner      : _owner,
							users      : count,
							lastjoin_at: new Date(room.lastjoin_at).getTime(),
							priority   : room.priority || 0
						};

						_rooms.push(_data);
					});

					// sort (priority, users, lastjoin_at, name)
					_rooms.sort(function(a, b) {
						if (a.priority != b.priority)
							return b.priority - a.priority;

						if (a.users != b.users)
							return (b.users - a.users); // b - a == descending

						if (a.avatar && !b.avatar)
							return -1;
						else if (!a.avatar && b.avatar)
							return 1;
						else
							return 0;

						if (a.lastjoin_at != b.lastjoin_at)
							return (b.lastjoin_at - a.lastjoin_at); // b - a == descending

						return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					});

					homeEvent.rooms = _rooms;
					return callback(null);
				});

			},

			function onlines(callback) {
				var q = User.find({ username: {$ne:null} }, 'username avatar color facebook online')
					.sort({online: -1})
					.limit(200);

				q.exec(function(err, users) {
					if (err)
						return callback('Error while retrieving users list: '+err);

					var list = [];
					_.each(users, function(u) {
						var status = (u.online == true)
							? 'online'
							: 'offline';

						list.push({
							user_id: u._id.toString(),
							username: u.username,
							avatar: u._avatar(),
							color: u.color,
							status: status
						});
					});

					homeEvent.users = list;
					return callback(null);
				});
			}

		], function(err) {
			if (err)
				return next(null, {code: 500, err: err});

			// @todo : restore log
			//logger.log('home', socket.getUsername(), null, start);

			return next(null, homeEvent);
		}
	);
};