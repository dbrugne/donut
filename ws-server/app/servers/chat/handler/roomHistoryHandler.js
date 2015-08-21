var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var retriever = require('../../../../../shared/models/historyroom').retrieve();

var Handler = function(app) {
	this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

	var user = session.__currentUser__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name parameter is mandatory');

			if (!room)
				return callback('unable to retrieve room: '+data.name);

			return callback(null);
		},

		function history(callback) {
			var options = {
				isAdmin: (session.settings.admin === true), // allow admin to see whole rooms history
				since: data.since,
				limit: data.limit
			};
			retriever(room.id, user.id, options, function(err, history) {
				if (err)
					return callback(err);

				var historyEvent = {
					name      : room.name,
					id        : room.id,
					history   : history.history,
					more      : history.more
				};
				return callback(null, historyEvent);
			});
		},

	], function(err, historyEvent) {
		if (err) {
			logger.error('[room:history]' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, historyEvent);
	});

};