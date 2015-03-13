var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');
var pattern = new RegExp("^[0-9a-fA-F]{24}$");

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

			if (!data.events || !_.isArray(data.events))
				return callback('events parameter is mandatory for room:viewed');

			data.events = _.filter(data.events, function(id) {
			  // http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
				return pattern.test(id);
			});
			if (!data.events.length)
				return callback('events parameter should contains at least one valid event ID in room:viewed');

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
			HistoryRoom.update({
				_id: {$in: data.events},
				event: 'room:message'
			}, {
				$addToSet: {viewed: user._id}
			}, {
				multi:true
			}, function(err) {
				return callback(err, room, user);
			});
		},

		function sendToUserSockets(room, user, callback) {
			var viewedEvent = {
				name: room.name,
				events: data.events
			};
			that.app.globalChannelService.pushMessage('connector', 'room:viewed', viewedEvent, 'user:'+user._id.toString(), {}, function(err) {
				return callback(err, user, room);
			});
		}

	], function(err) {
		if (err)
			logger.error(err);

		next(err);
	});

};