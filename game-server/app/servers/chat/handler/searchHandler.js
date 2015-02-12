var logger = require('pomelo-logger').getLogger('pomelo', __filename);
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
 * Handle search logic
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.search = function(data, session, next) {

	var that = this;

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

	var pattern = data.search
			.replace(/([@#])/g, '') // remove # and @
			.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"); // escape regex special chars
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
							avatar: room._avatar(),
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

				var q = User.find(search, 'username avatar color facebook');
				q.sort({'lastonline_at': -1, 'lastoffline_at': -1})
						.limit(200);
				q.exec(function(err, users) {
					if (err)
						return callback('Error while searching for users: '+err);

					var list = [];
					_.each(users, function(user) {
						var r = {
							user_id: user._id.toString(),
							username: user.username,
							avatar: user._avatar(),
							color: user.color
						};

						list.push(r);
					});

					if (lightSearch) {
						return callback(null, list);
					} else {
						var uids = _.map(list, function(u) { return u.user_id; });
						that.app.statusService.getStatusByUids(uids, function(err, results) {
							if (err)
								return callback('Error while retrieving user status: '+err);

							_.each(list, function(element, index, _list) {
								_list[index].status = (results[element.user_id])
										? 'online'
										: 'offline';
							});

							return callback(null, list);
						});
					}
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

			return next(null, event);
		}
	);

};