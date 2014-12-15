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
handler.search = function(data, session, next) {

	if (!data.search)
		return;

	var searchInRooms = (data.rooms && data.rooms == true)
		? true
		: false;

	var searchInUsers = (data.users && data.users == true)
		? true
		: false;

	if (!searchInRooms && !searchInUsers)
		return;

	var lightSearch = (data.light && data.light == true)
		? true
		: false;

	var pattern = data.search.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	var regexp = new RegExp(pattern, "i");

	async.parallel([

			function roomSearch(callback) {
				if (!searchInRooms)
					return callback(null, false);

				var search = {
					name: regexp
				};

				var q;
				if (!lightSearch) {
					q = Room
						.find(search, 'name owner description topic avatar color users lastjoin_at')
						.sort({'lastjoin_at': -1})
						.limit(150)
						.populate('owner', 'username');
				} else {
					q = Room
						.find(search, 'name avatar color lastjoin_at')
						.sort({'lastjoin_at': -1})
						.limit(150);
				}
				q.exec(function(err, rooms) {
					if (err)
						return callback('Error while searching for rooms: '+err);

					var results = [];
					_.each(rooms, function(room) {
						var owner = {};
						if (room.owner != undefined) {
							owner = {
								user_id: room.owner._id.toString(),
								username: room.owner.username
							};
						}

						var count = (room.users)
							? room.users.length
							: 0;

						var r = {
							name: room.name,
							avatar: room.avatar,
							color: room.color,
							lastjoin_at: new Date(room.lastjoin_at).getTime()
						};

						if (!lightSearch) {
							r.owner = owner;
							r.description = room.description;
							r.topic = room.topic;
							r.users = count;
						}

						results.push(r);
					});

					// sort (users, lastjoin_at, name)
					results.sort(function(a, b) {
						if (a.users != b.users)
							return (b.users - a.users); // b - a == descending

						if (a.lastjoin_at != b.lastjoin_at)
							return (b.lastjoin_at - a.lastjoin_at); // b - a == descending

						return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					});

					return callback(null, results);
				});

			},

			function userSearch(callback) {
				if (!searchInUsers)
					return callback(null, false);

				var search = {
					username: regexp
				};

				var q = User.find(search, 'username avatar color facebook status');
				q.exec(function(err, users) {
					if (err)
						return callback('Error while searching for users: '+err);

					var results = [];
					_.each(users, function(user) {
						var r = {
							username: user.username,
							avatar: user._avatar(),
							color: user.color
						};

						if (!lightSearch) {
							r.status = (user.status)
								? 'online'
								: 'offline';
						}

						results.push(r);
					});

					return callback(null, results);
				});

			}

		], function(err, results) {
			if (err)
				return next(null, {code: 500, err: err});

			var event = {};
			if (results[0] !== false)
				event.rooms = results[0];
			if (results[1] !== false)
				event.users = results[1];
			if (data.key)
				event.key = data.key;

			// @todo : restore log

			return next(null, event);
		}
	);

};