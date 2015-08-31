var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
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
	var opedUser = session.__user__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.room_id)
				return callback('id is mandatory');

			if (!data.user_id)
				return callback('require username param');

      if (!room)
        return callback('unable to retrieve room: ' + data.room_id);

			if (!user)
				return callback('unable to retrieve user: ' + data.user_id);

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
        return callback('this user ' + user.id + ' isn\'t able to op another user in this room: ' + data.room_id);

      if (!opedUser)
        return callback('unable to retrieve opedUser in room:op: ' + data.username);

			if (room.isOwner(opedUser.id))
				return callback(opedUser.username + ' is owner and can not be devoiced of ' + room.name);

      if (room.op.indexOf(opedUser._id) !== -1)
        return callback('user '+opedUser.username+' is already OP of ' + room.name);

			return callback(null);
		},

		function persist(callback) {
			room.update({$addToSet: { op: opedUser._id }}, function(err) {
        return callback(err);
      });
		},

		function broadcast(callback) {
			var event = {
				by_user_id : user.id,
				by_username: user.username,
				by_avatar  : user._avatar(),
				user_id: opedUser.id,
				username: opedUser.username,
				avatar: opedUser._avatar()
			};

			roomEmitter(that.app, user, room, 'room:op', event, callback);
		},

		function notification(sentEvent, callback) {
			Notifications(that.app).getType('roomop').create(opedUser, room, sentEvent.id, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:op] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};