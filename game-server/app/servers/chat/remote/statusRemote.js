var debug = require('debug')('donut:server:statusRemote');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../server/app/models/user');
var roomEmitter = require('../../../../../server/ws/_room-emitter');
var oneEmitter = require('../../../../../server/ws/_one-emitter');

var GLOBAL_CHANNEL_NAME = 'global';

module.exports = function(app) {
	return new DisconnectRemote(app);
};

var DisconnectRemote = function(app) {
	this.app = app;
};

/**
 * Handle "this user goes online logic":
 * - update lastonline_at
 * - broadcast user:online message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with hi
 *
 * @param {String} uid unique id for user
 * @param {String} welcome message
 */
DisconnectRemote.prototype.online = function(uid, welcome, globalCallback) {

	var that = this;

	debug('online call for user '+uid);

	async.waterfall([

		function persistOnUser(callback) {
			User.update(uid, {
				'lastonline_at': Date.now(),
				online: true
			}, function(err) {
				if (err)
					return callback('Error while updating user online status: '+err);

				return callback(null);
			});
		},

		function prepareEvent(callback) {
			return callback(null, {
				user_id		: welcome.user.user_id,
				username	: welcome.user.username,
				avatar		: welcome.user.avatar,
				color			: welcome.user.color
			});
		},

		function toRooms(event, callback) {
			if (!welcome.rooms || welcome.rooms.length < 1)
				return callback(null, event);

			var roomsToInform = _.map(welcome.rooms, function(room) {
				return room.name;
			});

			roomEmitter(that.app, roomsToInform, 'user:online', event, function (err) {
				if (err)
					return callback(err);

				debug('inform following rooms: ');
				debug(roomsToInform);
				return callback(null, event);
			});
		},

		function toOnes(event, callback) {
			if (!welcome.onetoones || welcome.onetoones.length < 1)
				return callback(null, event);

			User.find({onetoones: { $in: [uid] }}, 'username', function(err, ones) {
				if (err)
					return callback('Unable to find onetoones to inform on connection: '+err);

				var onesToInform = [];
				_.each(ones, function(one) {
					if (!one || !one.username)
						return;

					onesToInform.push({from: uid, to: one._id.toString()});
				});

				if (onesToInform.length < 1)
					return callback(null, event);

				oneEmitter(that.app, onesToInform, 'user:online', event, function (err) {
					if (err)
						return callback(err);

					return callback(null, event);
				});
			});
		}

	], function(err, event) {
		debug('online done for user '+uid);
		return globalCallback(err);
	});

};

/**
 * Handle "this user goes offline logic":
 * - update lastoffline_at
 * - broadcast user:offline message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with him
 *
 * @param {String} uid unique id for user
 *
 */
DisconnectRemote.prototype.offline = function(uid, globalCallback) {

	var that = this;

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

			roomEmitter(that.app, roomsToInform, 'user:offline', event, function (err) {
				if (err)
					return callback(err);

			  debug('inform following rooms: ');
				debug(roomsToInform);
				return callback(null, user, event);
			});
		},

		function emitUserOfflineToOnes(user, event, callback) {
			User.find({onetoones: { $in: [uid] }}, 'username', function(err, ones) {
				if (err)
					return callback('Unable to find onetoones to inform on connection: '+err);

				var onesToInform = [];
				_.each(ones, function(one) {
					if (!one || !one.username)
						return;

					onesToInform.push({from: uid, to: one._id.toString()});
				});

				if (onesToInform.length < 1)
					return callback(null, user, event);

				oneEmitter(that.app, onesToInform, 'user:offline', event, function (err) {
					if (err)
						return callback(err);

					return callback(null, user, event);
				});
			});
		},

	], function (err, user, event) {
		if (err)
			return globalCallback(err);

		debug(uid+' ('+user.username+') goes offline');
		return globalCallback(null);
	});

};
