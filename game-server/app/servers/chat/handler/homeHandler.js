var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var featuredRooms = require('../../../util/featuredRooms');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle home logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.home = function(data, session, next) {

	var homeEvent = {};

	var that = this;

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
							avatar     : room._avatar(),
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
				var q = User.find({ username: {$ne:null} }, 'username avatar color facebook')
				q.sort({'lastonline_at': -1, 'lastoffline_at': -1})
					.limit(200);

				q.exec(function(err, users) {
					if (err)
						return callback('Error while retrieving users list: '+err);

					var list = [];
					_.each(users, function(u, index) {
						list.push({
							user_id: u._id.toString(),
							username: u.username,
							avatar: u._avatar(),
							color: u.color,
							sort: index
						});
					});

					return callback(null, list);
				});
			},

			function status(users, callback) {
				var uids = _.map(users, function(u) { return u.user_id; });
				that.app.statusService.getStatusByUids(uids, function(err, results) {
					if (err)
						return callback('Error while retrieving user status: '+err);

					_.each(users, function(element, index, list) {
						list[index].status = (results[element.user_id])
								? 'online'
								: 'offline';
						list[index].sort = ((results[element.user_id]) ? 0 : 1) + '' + list[index].sort;
					});

					users = _.sortBy(users, 'sort');

					homeEvent.users = users;
					return callback(null);
				});
			},

			function featured(callback) {
				featuredRooms(that.app, function(err, featured) {
					if (err)
						logger.error('Error while retrieving featured rooms: '+err);

					// union lists
					var alreadyInNames = _.map(featured, function(r) {
						return r.name;
					});
					_.each(homeEvent.rooms, function(room) {
						if (alreadyInNames.indexOf(room.name) === -1)
						  featured.push(room);
					});
					homeEvent.rooms = featured;

					return callback(null);
				});
			}

		], function(err) {
			if (err)
				return next(null, {code: 500, err: err});

			return next(null, homeEvent);
		}
	);
};