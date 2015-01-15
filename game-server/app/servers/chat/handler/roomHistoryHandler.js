var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var retriever = require('../../../../../shared/models/historyroom').retrieve();
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
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.history = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name parameter is mandatory for room:history');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:history: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:history: '+data.name);

				return callback(null, room);
			});
		},

		function history(room, callback) {
			retriever(room.name, session.uid, {since: data.since}, function(err, history) {
				if (err)
					return callback(err);

				var historyEvent = {
					name      : room.name,
					history   : history.history,
					more      : history.more
				};
				return callback(null, room, historyEvent);
			});
		},

	], function(err, room, historyEvent) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		log.activity('room:history', session.uid, data.name, start);

		next(null, historyEvent);
	});

};