var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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
 * Handle room history viewing logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.viewed = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name parameter is mandatory for room:viewed');

			if (!data.event)
				return callback('event parameter is mandatory for room:viewed');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:viewed: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:viewed: '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:viewed: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:viewed: '+session.uid);

				return callback(null, room, user);
			});
		},

		function persist(room, user, callback) {
			var subDocument = null;

			// find an existing sub document
			if (user.rooms_viewed) {
				subDocument = _.find(user.rooms_viewed, function(sub) {
					if (sub.room != room.name)
					  return false;

					sub.event = data.event;
					sub.time = Date.now();
					return true;
				});
			}

			// create a new subdocument
			if (!subDocument) {
			  subDocument = {
					room: room.name,
					event: data.event
				};
				user.rooms_viewed.push(subDocument);
			}

			user.save(function(err) {
				if (err)
				  return callback(err);

				return callback(err, room, user);
			});
		},

		function sendToUserSockets(room, user, callback) {
			var viewedEvent = {
				name: room.name,
				event: data.event
			};
			that.app.globalChannelService.pushMessage('connector', 'room:viewed', viewedEvent, 'user:'+session.uid, {}, function(err) {
				if (err)
					return callback('Error while sending room:viewed message to user clients: '+err);

				return callback(null, user, room);
			});
		}

	], function(err, room, user) {
		if (err)
			logger.error(err);

		next(err);
	});

};