var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomDataHelper = require('../../../util/roomData');
var roomEmitter = require('../../../util/roomEmitter');
var Notifications = require('../../../components/notifications');

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
			if (!data.room_id && !data.name)
				return callback('room_id or name is mandatory');

      if (!room)
        return callback('notexists');

      if (room.isBanned(user.id))
        return callback('banned');

			return callback(null);
		},

		/**
		 * This step happen BEFORE user/room persistence and room subscription
		 * to avoid noisy notifications
		 */
		function broadcast(callback) {
			var event = {
				user_id		: user.id,
				username  : user.username,
				avatar    : user._avatar()
			};

			roomEmitter(that.app, user, room, 'room:in', event, callback);
		},

		function persist(eventData, callback) {
			room.lastjoin_at = Date.now();
			room.users.addToSet(user._id);
			room.save(function(err) {
        return callback(err, eventData);
			});
		},

		function joinClients(eventData, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(user.id, function(err, sids) {
				if (err)
					return callback(err);

				if (!sids || sids.length < 1)
          return callback('no connector sessions for current user (probably a problem somewhere)');

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.add(room.name, user.id, sid, function(err) {
							if (err)
								return fn(sid + ': ' + err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err) {
          return callback(err, eventData);
				});
			});
		},

		function roomData(eventData, callback) {
			roomDataHelper(that.app, user, room, function(err, roomData) {
				if (err)
					return callback(err);

				if (roomData == null)
					return callback('roomDataHelper was unable to return excepted data for ' + room.name);

				return callback(null, eventData, roomData);
			});
		},

		function sendToUserClients(eventData, roomData, callback) {
			that.app.globalChannelService.pushMessage('connector', 'room:join', roomData, 'user:' + user.id, {}, function(err) {
				if (err)
					return callback('Error while sending room:join message to user clients: ' + err);

				return callback(null, eventData);
			});
		},

		function notification(eventData, callback) {
			Notifications(that.app).getType('roomjoin').create(room, eventData.id, callback);
		}

	], function(err) {
		if (err === 'notexists')
			return next(null, {code: 404, err: err});
		if (err === 'banned')
			return next(null, {code: 403, err: err});
		if (err) {
      logger.error('[room:join] ' + err);
      return next(null, {code: 500, err: err});
    }

		return next(null);
	});

};