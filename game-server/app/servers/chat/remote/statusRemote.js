var debug = require('debug')('donut:server:statusRemote');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../server/app/models/user');

var GLOBAL_CHANNEL_NAME = 'global';

module.exports = function(app) {
	return new DisconnectRemote(app);
};

var DisconnectRemote = function(app) {
	this.app = app;
};

/**
 * Handle "this user goes online logic":
 * - broadcast user:online message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with him
 * - update lastonline_at
 *
 * @param {String} uid unique id for user
 *
 */
DisconnectRemote.prototype.goesOnline = function(uid, globalCallback) {

	//function persistOnliness(user, callback) {
	//	user.set('lastonline_at', Date.now());
	//	user.set('online', true);
	//	user.save(function(err) {
	//		if (err)
	//			return callback('Error while updating user onliness: '+err);
  //
	//		return callback(null, user)
	//	});
	//},

	//function emitUserOnlineToRooms(user, callback) {
	//	// user:online, only for first socket
	//	if (helper.userSockets(io, socket.getUserId()).length > 1)
	//		return callback(null, user);
	//
	//	var roomsToInform = [];
	//	helper._.each(welcomeEvent.rooms, function(room) {
	//		if (!room || !room.name)
	//			return;
	//
	//		roomsToInform.push(room.name);
	//	});
	//
	//	if (roomsToInform.length < 1)
	//		return callback(null, user);
	//
	//	roomEmitter(io, roomsToInform, 'user:online', userEvent, function (err) {
	//		if (err)
	//			return callback(err);
	//
	//		return callback(null, user);
	//	});
	//},

	//function emitUserOnlineToOnes(user, callback) {
	//	// user:online, only for first socket
	//	if (helper.userSockets(io, socket.getUserId()).length > 1)
	//		return callback(null, user);
	//
	//	User.find({onetoones: { $in: [socket.getUserId()] }}, 'username', function(err, ones) {
	//		if (err)
	//			return callback('Unable to find onetoones to inform on connection: '+err);
	//
	//		var onesToInform = [];
	//		helper._.each(ones, function(one) {
	//			if (!one || !one.username)
	//				return;
	//
	//			onesToInform.push({from: socket.getUserId(), to: one._id.toString()});
	//		});
	//
	//		if (onesToInform.length < 1)
	//			return callback(null, user);
	//
	//		oneEmitter(io, onesToInform, 'user:online', userEvent, function (err) {
	//			if (err)
	//				return callback(err);
	//
	//			return callback(null, user);
	//		});
	//	});
	//},

};

/**
 * Handle "this user goes offline logic":
 * - broadcast user:offline message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with him
 * - update lastoffline_at
 *
 * @param {String} uid unique id for user
 *
 */
DisconnectRemote.prototype.goesOffline = function(uid, globalCallback) {

	async.waterfall([

		function retrieveUser(callback){
			var q = User.findById(uid);
			q.exec(function(err, user) {
				if (err)
					return callback('Unable to find user: '+err, null);

				return callback(null, user);
			});
		},

		function persistOfflineAt(user, callback) {
			user.set('lastoffline_at', Date.now());
			user.set('online', false);
			user.save(function(err) {
				if (err)
					return callback('Error while updating user offliness: '+err);

				return callback(null, user);
			});
		},

		function prepareEvent(user, callback) {
			return callback(null, user, {
				user_id   : user._id.toString(),
				username  : user.username,
				avatar    : user._avatar(),
				color     : user.color
			});
		},

		function emitUserOfflineToRooms(user, event, callback) {
			var roomsToInform = _.filter(user.rooms, function(name) {
				return !!name;
			});

			if (roomsToInform.length < 1)
				return callback(null, user, event);

			// @todo
			//roomEmitter(roomsToInform, 'user:offline', event, function (err) {
			//	if (err)
			//		return callback(err);
      //
			  debug('inform following rooms: ');
				debug(roomsToInform);
				return callback(null, user, event);
			//});
		},

		function emitUserOfflineToOnes(user, event, callback) {
			User.find({onetoones: { $in: [uid] }}, 'username', function(err, ones) {
				if (err)
					return callback('Unable to find onetoones to inform on connection: '+err);

				var onesToInform = _.filter(ones, function(one) {
					return !(!one || !one.username);
				});

				if (onesToInform.length < 1)
					return callback(null, user, event);

				//oneEmitter(onesToInform, 'user:offline', event, function (err) {
				//	if (err)
				//		return callback(err);
        //
					return callback(null, user, event);
				//});
			});
		},

	], function (err, user, event) {
		if (err)
			return globalCallback(err);

		// @todo : reactivate logs
		//logger.log('disconnect', socket.getUsername(), '', start);

		debug(uid+' ('+user.username+') goes offline');
		return globalCallback(null);
	});

};
