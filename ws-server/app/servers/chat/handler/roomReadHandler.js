var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.read = function(data, session, next) {

  var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory');

			if (!room)
				return callback('not retrieve');

			return callback(null);
		},

		function prepare(callback) {
			// owner
			var owner = {};
			if (room.owner) {
				owner = {
					user_id: room.owner._id,
					username: room.owner.username,
					avatar: room.owner._avatar()
				};
			}

			// op
			var ops = [];
			if (room.op && room.op.length > 0) {
				_.each(room.op, function(op) {
					ops.push({
						user_id: op.id,
						username: op.username,
						avatar: op._avatar()
					});
				});
			}

			// ban
			var bans = [];
			if (room.bans && room.bans.length > 0) {
				_.each(room.bans, function(ban) {
					bans.push({
						user_id: ban.user.id,
						username: ban.user.username,
						avatar: ban.user._avatar(),
						banned_at: ban.banned_at,
						reason: ban.reason
					});
				});
			}

			// devoices
			var devoices = [];
			if (room.devoices && room.devoices.length) {
				_.each(room.devoices, function(devoice) {
					devoices.push({
						user_id: devoice.user.id,
						username: devoice.user.username,
						avatar: devoice.user._avatar(),
						devoiced_at: devoice.devoiced_at,
						reason: devoice.reason
					});
				});
			}

			// users
			var users = [];
			if (room.users && room.users.length > 0) {
				_.each(room.users, function(u) {
					users.push({
						user_id: u.id,
						username: u.username,
						avatar: u._avatar()
					});
				});
			}

			var roomData = {
				name: room.name,
				id: room.id,
				owner: owner,
				op: ops,
				bans: bans,
				devoices: devoices,
				users: users,
				avatar: room._avatar(),
				poster: room._poster(),
				color: room.color,
				website: room.website,
				topic: room.topic,
				description: room.description,
				created: room.created_at
			};

			if (session.settings.admin === true) {
				roomData.visibility = room.visibility || false;
				roomData.priority = room.priority || 0;
			}

			return callback(null, roomData);
		}

	], function(err, roomData) {
		if (err) {
			logger.error('[room:read] ' + err);
			return next(null, {code: 500, err: err});
		}

		return next(null, roomData);
	});

};