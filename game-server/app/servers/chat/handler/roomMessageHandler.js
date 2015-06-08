var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var roomEmitter = require('../../../util/roomEmitter');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var inputUtil = require('../../../util/input');
var imagesUtil = require('../../../util/images');
var keenio = require('../../../../../shared/io/keenio');

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
handler.message = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory for room:message');

			return callback(null);
		},

		//function adminCommands(callback) {
		//	if (data.name != '#donut'
		//		|| !socket.isAdmin()
		//		|| !data.message
		//		|| data.message.substring(0, 1) != '/')
		//		return callback(null);
   //
		//	admin(io, socket, data, callback);
		//},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:message: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:message: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:message: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:message: '+session.uid);

				return callback(null, room, user);
			});
		},

		function checkHeIsIn(room, user, callback) {
			// Test if the current user is in room
			if (user.rooms.indexOf(room.id) === -1)
				return callback('room:message, this user '+session.uid+' is not currently in room '+room.name);

			return callback(null, room, user);
		},

		function prepareEvent(room, user, callback) {
			// text filtering
			var message = inputUtil.filter(data.message, 512);

			// images filtering
			var images = imagesUtil.filter(data.images);

			if (!message && !images)
				return callback('Empty message (no text, no image)');

			var event = {
				name: room.name,
				time: Date.now(),
				user_id: user._id.toString(),
				username: user.username,
				avatar: user._avatar()
			};
			if (message)
			  event.message = message;
			if (images && images.length)
				event.images = images;

			return callback(null, room, event);
		},

		function historizeAndEmit(room, event, callback) {
			roomEmitter(that.app, room.name, 'room:message', event, function(err) {
				if (err)
					return callback(err);

				return callback(null, room, event);
			});
		},

		function tracking(room, event, callback) {
			var messageEvent = {
				session: {
					id: session.settings.uuid,
					connector: session.frontendId
				},
				user: {
					id: session.uid,
					username: session.settings.username,
					admin: (session.settings.admin === true)
				},
				room: {
					name: room.name
				},
				message: {
					length: event.message.length,
					images: (event.images && event.images.length) ? event.images.length : 0
				}
			};
			keenio.addEvent("room_message", messageEvent, function(err, res){
				if (err)
					logger.error('Error while tracking room_message in keen.io for '+uid+': '+err);

				return callback(null);
			});
		}

	], function(err) {
		if (err && err != 'admin')
			logger.error(err);

		next(null); // even for .notify
	});

};