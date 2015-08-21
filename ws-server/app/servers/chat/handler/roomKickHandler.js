var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

	var user = session.__currentUser__;
	var kickedUser = session.__user__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('require room name param');

			if (!data.username)
				return callback('require username param');

			if (!room)
				return callback('unable to retrieve room: '+data.name);

			if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
				return callback('this user ' + user.id + ' isn\'t able to kick another user in this room: ' + data.name);

      if (!kickedUser)
        return callback('unable to retrieve kickedUser: ' + data.username);

      if (room.owner.toString() == kickedUser.id)
        return callback('user '+kickedUser.username+' is owner of '+room.name);

      if (room.users.indexOf(kickedUser.id) === -1)
        return callback('can\'t kick user '+user.username+' that is not actually in the room: '+data.name);

			return callback(null);
		},

		function persist(callback) {
			room.update({$pull: { users: kickedUser._id }}, function(err) {
        return callback(err);
			});
		},

		function prepareEvent(callback) {
			var event = {
				name			 : room.name,
				id				 : room.id,
				by_user_id : user.id,
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: kickedUser.id,
				username: kickedUser.username,
				avatar: kickedUser._avatar()
			};

			if (data.reason)
				event.reason = data.reason;

			return callback(null, event);
		},

		function historizeAndEmit(event, callback) {
			roomEmitter(that.app, 'room:kick', event, callback);
		},

		/**
		 * /!\ .unsubscribeClients come after .historizeAndEmit to allow kicked user to receive message
		 */
		function unsubscribeClients(sentEvent, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(kickedUser.id, function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (!sids || sids.length < 1) {
					return callback(null, sentEvent); // the targeted user could be offline at this time
				}

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, kickedUser.id, sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('error while unsubscribing user ' + kickedUser.id + ' from '+room.name+': '+err);

					return callback(null, sentEvent);
				});
			});
		},

		function notification(sentEvent, callback) {
			Notifications(that.app).getType('roomkick').create(kickedUser, room, sentEvent.id, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:kick] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};