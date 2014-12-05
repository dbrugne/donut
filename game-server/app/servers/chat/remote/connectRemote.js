var debug = require('debug')('donut:server:connectRemote');
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../server/config/index');
var User = require('../../../../../server/app/models/user');
var Room = require('../../../../../server/app/models/room');
var hello = require('../../../../../server/app/hello-dolly');
var oneDataHelper = require('../../../../../server/ws/_one-data');
var roomDataHelper = require('../../../../../server/ws/_room-data');

var GLOBAL_CHANNEL_NAME = 'global';

module.exports = function(app) {
	return new ConnectRemote(app);
};

var ConnectRemote = function(app) {
	this.app = app;
};

/**
 * Handle new "socket" connection logic:
 * - handle default room (#donut) auto-join logic
 * - set lastonline_at on user
 * - register uid@frontendId in joined room "global channels"
 * - register uid@frontendId in global "global channels"
 * - generate and pass to callback welcome message
 *
 * @param {String} uid unique id for user
 * @param {String} frontendId server id
 *
 */
ConnectRemote.prototype.connect = function(uid, frontendId, globalCallback) {

	debug('connect '+uid+'@'+frontendId);

	// welcome event data
	var welcomeEvent = {
		hello: hello()
	};

	var that = this;

	async.waterfall([

		/**
		 * @todo : determine if another socket already up:
		 * - how much connector user is on (app.get('statusService').getSidsByUid(uid))
		 * - then how many "session" on this connector for this uid (app.get('sessionService').getByUid(uid);)
		 * - app.get('statusService').getIsFirstConnection(uid)
		 * @todo : move this in statusRemote
		 * @todo : call statusRemote
		 * @todo : test
		 */
		//function isLastSocket(callback) {
		//	that.app.statusService.getStatusByUid(uid, function(err, status) {
		//		if (err)
		//			return debug('Error while retrieving user status: '+err);
    //
		//		// At least an other socket is live for this user or not
		//		var lastSocket = !status;
		//		debug('IMPORTANT !!! connect lastsocket: ', lastSocket);
    //
		//		return callback(null); // @todo : last socket, should be able to count if at least "two" sessions exists (including this one)
		//	});
		//},

		function retrieveUser(callback){
			var q = User.findById(uid);
			q.populate('onetoones', 'username');
			q.exec(function(err, user) {
				if (err)
					return callback('Unable to find user: '+err, null);

				// welcome message is displayed until user hasn't check the box
				var welcomeMessage = (user.welcome === true || user.welcome == undefined)
					? true
					: false;

				welcomeEvent.user = {
					user_id: user._id.toString(),
					username: user.username,
					avatar: user._avatar(),
					color: user.color,
					welcome: welcomeMessage
				};

				return callback(null, user);
			});
		},

		function donutRoom(user, callback) {
			// special case of #donut room autojoin
			if (user.general == true && user.rooms.indexOf(conf.room.general) == -1) {
				User.findOneAndUpdate({_id: user._id}, {$addToSet: { rooms: conf.room.general }}, function(err, user) {
					if (err)
						return callback('Unable to persist #donut on user: '+err);

					Room.findOneAndUpdate({name: conf.room.general}, {$addToSet: {users: user._id}}, function(err) {
						if (err)
							return callback('Unable to persist user on #donut: '+err);

						// Inform other #donut users (user:online)
						// @todo reactivate room:in messages
						//roomEmitter(io, conf.room.general, 'room:in', userEvent, function(err) {
							return callback(err, user);
						//});
					});
				});
			} else {
				return callback(null, user);
			}
		},

		function populateOnes(user, callback){
			if (user.onetoones.length < 1)
				return callback(null, user);

			var parallels = [];
			_.each(user.onetoones, function(one) {
				if (!one.username)
					return debug('Empty username found in populateOnes for user: '+uid);
				parallels.push(function(fn) {
					oneDataHelper(uid, one.username, function(err, one) {
						if (err)
							return fn(err);
						else
							return fn(null, one);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while populating onetoones: '+err);

				welcomeEvent.onetoones = _.filter(results, function(o) {
					return o !== null;
				});
				return callback(null, user);
			});
		},

		function populateRooms(user, callback) {
			if (user.rooms.length < 1)
				return callback(null, user);

			var parallels = [];
			_.each(user.rooms, function(name) {
				parallels.push(function(fn) {
					roomDataHelper(uid, name, function(err, room) {
						if (err)
							return fn(err);
						else
							return fn(null, room);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while populating rooms: '+err);

				welcomeEvent.rooms = _.filter(results, function(r) {
					return r !== null;
				});
				return callback(null, user);
			});
		},

		function subscribeUserInRoomChannels(user, callback) {
			if (user.rooms.length < 1)
				return callback(null, user);

			var parallels = [];
			_.each(user.rooms, function(name) {
				parallels.push(function(fn) {
					that.app.globalChannelService.add(name, uid, frontendId, function(err) {
						if (err)
							return fn('Error while registering user in room channel: '+err);

						return fn(null, name);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while registering user in rooms channels: '+err);

				return callback(null, user);
			});
		},

		function subscribeUserInGlobalChannel(user, callback) {
			that.app.globalChannelService.add(GLOBAL_CHANNEL_NAME, uid, frontendId, function(err) {
				if (err)
					return callback('Error while registering user in global channel: '+err);

				return callback(null, user);
			});
		}

	], function (err, user) {
		if (err)
			return globalCallback(err);

		// @todo : reactivate logs
		//logger.log('connect', socket.getUsername(), '', start);

		debug('connected '+uid+'@'+frontendId);
		return globalCallback(null, welcomeEvent);
	});

};
