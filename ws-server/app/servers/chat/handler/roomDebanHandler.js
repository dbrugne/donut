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
	var bannedUser = session.__user__;
	var room = session.__room__;
	
	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.room_id)
				return callback('id is mandatory');

			if (!data.username)
				return callback('require username param');

			if (!room)
				return callback('unable to retrieve room: ' + data.room_id);

			if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
				return callback('this user ' + user.id + ' isn\'t able to deban another user in this room: ' + room.name);

			if (!bannedUser)
				return callback('unable to retrieve bannedUser: ' + data.username);

			return callback(null);
		},

		function persist(callback) {
			if (!room.bans || !room.bans.length)
				return callback('there is no user banned from this room');

			if (!room.isBanned(bannedUser.id))
				return callback('this user '+bannedUser.username+' is not banned from '+room.name);

			var subDocument = _.find(room.bans, function(ban) {
				if (ban.user.toString() == bannedUser.id)
					return true;
			});
			room.bans.id(subDocument._id).remove();
			room.save(function(err) {
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

			roomEmitter(that.app, user, room, 'room:deban', event, callback);
		},

		function notification(event, callback) {
			Notifications(that.app).getType('roomdeban').create(bannedUser, room, event.id, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:deban] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};