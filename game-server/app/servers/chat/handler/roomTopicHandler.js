var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room topic logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.topic = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory for room:topic');

			if (!Room.validateTopic(data.topic))
				return callback('Invalid topic for '+data.name+': '+data.topic);

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:topic: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:topic: '+data.name);

				if (!room.isOwnerOrOp(session.uid))
					return callback('This user '+session.uid+' isn\'t able to change topic of '+data.name);

				return callback(null, room);
			});
		},

		function retrieveUser(room, callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in room:topic: '+err);

				if (!user)
					return callback('Unable to retrieve user in room:topic: '+session.uid);

				return callback(null, room, user);
			});
		},

		function prepareEvent(room, user, callback) {
			var topic = inputUtil.filter(data.topic, 512);

			if (topic === false)
			  topic = '';

			var event = {
				user_id : user._id.toString(),
				username: user.username,
				avatar  : user._avatar(),
				topic   : topic
			};
			return callback(null, room, user, event);
		},

		function persist(room, user, event, callback) {
			room.update({$set: {topic: event.topic}}, function(err) {
				if (err)
					return callback('Error while updating room '+data.name+' topic:'+err);

				return callback(null, room, user, event);
			});
		},

		function historizeAndEmit(room, user, event, callback) {
			roomEmitter(that.app, room.name, 'room:topic', event, function(err) {
				if (err)
					return callback(err);

				return callback(null);
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		log.activity('room:topic', session.uid, data.name, start);

		next(null, {});
	});

};