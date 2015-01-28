var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
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
 * Hander user read logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.read = function(data, session, next) {

	var start = log.start();

	var that = this;

	var roomFields = 'name avatar color owner op';

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('Param username is mandatory for user:read');

			if (!User.validateUsername(data.username))
				return callback('user:read Invalid username: '+data.username);

			return callback(null);
		},

		function retrieveUser(callback) {
			User.findByUsername(data.username).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+data.username+' in user:read: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:read: '+data.username);

				var rooms = {
					owned: [],
					oped: [],
					joined: []
				};

				return callback(null, user, rooms);
			});
		},

		function ownedRooms(user, rooms, callback) {
			Room.find({ owner: user._id }, roomFields).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (1) in user:read: '+err);

				_.each(results, function(room) {
					rooms.owned.push(room);
				});

				return callback(null, user, rooms);
			});
		},

		function oppedRooms(user, rooms, callback) {
			Room.find({ op: { $in: [user._id] } }, roomFields).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (2) in user:read: '+err);

				_.each(results, function(room) {
					rooms.oped.push(room);
				});

				return callback(null, user, rooms);
			});
		},

		function inRooms(user, rooms, callback) {
			if (!user.rooms || user.rooms.length < 1)
				return callback(null, user, rooms);

			Room.find({ name: { $in: user.rooms } }, roomFields).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (3) in user:read: '+err);

				_.each(results, function(room) {
					rooms.joined.push(room);
				});

				return callback(null, user, rooms);
			});
		},

		function status(user, rooms, callback) {
			that.app.statusService.getStatusByUid(user._id.toString(), function(err, status) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				return callback(null, user, rooms, status);
			});
		},

		function prepareData(user, rooms, status, callback) {
			// status
			var status = (status)
				? 'online'
				: 'offline';
			var onlined = (status)
				? user.lastonline_at
				: user.lastoffline_at;
			var userData = {
				user_id   : user._id.toString(),
				username  : user.username,
				color     : user.color,
				avatar    : user._avatar(),
				poster    : user._poster(),
				bio       : user.bio,
				location  : user.location,
				website   : user.website,
				registered: user.created_at,
				onlined   : onlined,
				status    : status
			};

			// rooms (mongoose => JSON)
			userData.rooms = {
				owned: [],
				oped: [],
				joined: []
			};
			_.each(Object.keys(rooms), function(type) {
				_.each(rooms[type], function(room) {
					var json = room.toJSON();
					json.avatar = room._avatar();
					userData.rooms[type].push(json);
				});
			});

			return callback(null, user, userData);
		},

		function accountData(user, userData, callback) {
			if (session.uid != user._id.toString())
			  return callback(null, user, userData);

			var account = {};

			// autojoin #donut option
			account.general = user.general;

			// email
			if (user.local && user.local.email)
				account.email = user.local.email;

			// facebook
			if (user.facebook) {
				var securedToken = (user.facebook.token)
					? 'yes'
					: '';

				account.facebook = {
					id: user.facebook.id,
					token: securedToken,
					email: user.facebook.email,
					name: user.facebook.name
				};
			}

			userData.account = account;
			return callback(null, user, userData);
		}

	], function(err, user, userData) {
		if (err)
			return next(null, {code: 500, err: err});

		log.activity('user:read', session.uid, data.username, start);

		return next(null, userData);
	});

};