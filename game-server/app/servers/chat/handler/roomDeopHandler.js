var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room deop logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 */
handler.deop = function(data, session, next) {

	var user = session.__currentUser__;
	var opedUser = session.__user__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('require room name param');

			if (!data.username)
				return callback('require username param');

			if (!user)
				return callback('unable to retrieve user: ' + session.uid);

			if (!room)
				return callback('unable to retrieve room: ' + data.name);

			if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
				return callback('this user ' + user.id + ' isn\'t able to deop another user in this room: ' + data.name);

			if (!opedUser)
				return callback('unable to retrieve opedUser: ' + data.username);

			if (room.op.indexOf(opedUser._id) === -1)
				return callback('user ' + opedUser.username + ' is not OP of ' + room.name);

			return callback(null);
		},

		function persist(callback) {
			room.update({$pull: { op: opedUser._id }}, function(err) {
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
				user_id: opedUser.id,
				username: opedUser.username,
				avatar: opedUser._avatar()
			};

			return callback(null, event);
		},

		function historizeAndEmit(event, callback) {
			roomEmitter(that.app, 'room:deop', event, callback);
		},

		function notification(event, callback) {
			Notifications(that.app).getType('roomdeop').create(opedUser, room, event.id, callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:deop] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};