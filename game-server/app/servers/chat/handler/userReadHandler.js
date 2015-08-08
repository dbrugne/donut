var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var common = require('donut-common');

var Handler = function(app) {
	this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.read = function(data, session, next) {

	var that = this;

	var roomFields = 'name avatar color owner op';

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('Param username is mandatory for user:read');

			return callback(null);
		},

		function retrieveCurrentUser(callback) {
			User.findByUid(session.uid).exec(function (err, currentUser) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:read: '+err);

				if (!currentUser)
					return callback('Unable to retrieve user in user:read: '+session.uid);

				return callback(null, currentUser);
			});
		},

		function retrieveUser(currentUser, callback) {
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

				return callback(null, currentUser, user, rooms);
			});
		},

		function ownedRooms(currentUser, user, rooms, callback) {
			Room.find({ owner: user._id, deleted: { $ne: true } }, roomFields).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (1) in user:read: '+err);

				_.each(results, function(room) {
					rooms.owned.push(room);
				});

				return callback(null, currentUser, user, rooms);
			});
		},

		function oppedRooms(currentUser, user, rooms, callback) {
			Room.find({ op: { $in: [user._id] }, deleted: { $ne: true } }, roomFields).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (2) in user:read: '+err);

				_.each(results, function(room) {
					rooms.oped.push(room);
				});

				return callback(null, currentUser, user, rooms);
			});
		},

		function inRooms(currentUser, user, rooms, callback) {
			Room.findByUser(user.id).exec(function (err, results) {
				if (err)
					return callback('Error while retrieving user rooms (3) in user:read: '+err);

				_.each(results, function(room) {
					rooms.joined.push(room);
				});

				return callback(null, currentUser, user, rooms);
			});
		},

		function status(currentUser, user, rooms, callback) {
			that.app.statusService.getStatusByUid(user.id, function(err, status) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				return callback(null, currentUser, user, rooms, status);
			});
		},

		function prepareData(currentUser, user, rooms, status, callback) {
			// status
			var status = (status)
				? 'online'
				: 'offline';
			var onlined = (status)
				? user.lastonline_at
				: user.lastoffline_at;
			var userData = {
				user_id   	: user.id,
				username  	: user.username,
				color     	: user.color,
				avatar    	: user._avatar(),
				poster    	: user._poster(),
				bio       	: user.bio,
				location  	: user.location,
				website   	: user.website,
				registered	: user.created_at,
				onlined   	: onlined,
				status    	: status,
				banned      : currentUser.isBanned(user.id), // for ban/deban menu
				i_am_banned : user.isBanned(currentUser.id) // for input enable/disable
			};

			// rooms (mongoose => JSON)
			userData.rooms = {
				owned: [],
				oped: [],
				joined: []
			};
			_.each(Object.keys(rooms), function(type) {
				_.each(rooms[type], function(room) {
					var roomData = {
						name	: room.name,
						id		: room.id,
						avatar: room._avatar()
					};
					userData.rooms[type].push(roomData);
				});
			});

			return callback(null, currentUser, user, userData);
		},

		function accountData(currentUser, user, userData, callback) {
			if (currentUser.id != user.id)
			  return callback(null, user, userData);

			var account = {};

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

		return next(null, userData);
	});

};