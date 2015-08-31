var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');

var Handler = function(app) {
	this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

	var user = session.__currentUser__;
	var bannedUser = session.__user__;
	var room = session.__room__;

	var that = this;

	var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : false;

	async.waterfall([

		function check(callback) {
			if (!data.room_id)
				return callback('room id is mandatory');

			if (!data.user_id)
				return callback('user id is mandatory');

			if (!room)
				return callback('unable to retrieve room: ' + data.room_id);

			if (!user)
				return callback('unable to retrieve room: ' + data.user_id);

			if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
				return callback('this user ' + user.id + ' isn\'t able to ban another user in this room: ' + room.name);

			if (!bannedUser)
				return callback('unable to retrieve bannedUser: '+ data.username);

			if (room.owner.toString() == bannedUser.id)
				return callback('user '+bannedUser.username+' is owner of '+room.name);

			if (room.isBanned(bannedUser.id))
				return callback('this user '+bannedUser.username+' is already banned from '+room.name);

			return callback(null);
		},

		function persist(callback) {
			var ban = {
				user: bannedUser._id,
				banned_at: new Date()
			};
			if (reason !== false)
				ban.reason = reason;

			room.update({$addToSet: { bans: ban }, $pull: { users: bannedUser._id, op: bannedUser._id }}, function(err) {
        return callback(err);
			});
		},

		function broadcast(callback) {
			var event = {
				by_user_id : user.id,
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: bannedUser.id,
				username: bannedUser.username,
				avatar: bannedUser._avatar()
			};

			if (reason !== false)
				event.reason = reason;

			roomEmitter(that.app, user, room, 'room:ban', event, callback);
		},

		/**
		 * /!\ .unsubscribeClients come after .historizeAndEmit to allow banned user to receive message
		 */
		function unsubscribeClients(event, callback) {
			// search for all the user sessions (any frontends)
			that.app.statusService.getSidsByUid(bannedUser.id, function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (!sids || sids.length < 1) {
					return callback(null, event); // the targeted user could be offline at this time
				}

				var parallels = [];
				_.each(sids, function(sid) {
					parallels.push(function(fn) {
						that.app.globalChannelService.leave(room.name, bannedUser.id, sid, function(err) {
							if (err)
								return fn(sid+': '+err);

							return fn(null);
						});
					});
				});
				async.parallel(parallels, function(err, results) {
					if (err)
						return callback('Error while unsubscribing user '+bannedUser.id+' from '+room.name+': '+err);

					return callback(null, event);
				});
			});
		},

		function notification(event, callback) {
			Notifications(that.app).getType('roomban').create(bannedUser, room,  event.id, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:ban] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};