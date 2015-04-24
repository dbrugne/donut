var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../config/index');
var uuid = require('node-uuid');
var keenio = require('../../../../../shared/io/keenio');

var GLOBAL_CHANNEL_NAME = 'global';
var USER_CHANNEL_PREFIX = 'user:';

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * New 'client' connection, we handle the logic here
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var that = this;

	logger.debug('connect request for '+session.__session__.__socket__.socket.getUserId()+'@'+session.frontendId+' sessionId: '+session.id);

	var uid = false;
	var firstClient = true;

	async.waterfall([

		function determineUid(callback) {
			if (session
				&& session.__session__
				&& session.__session__.__socket__
				&& session.__session__.__socket__.socket)
				uid = session.__session__.__socket__.socket.getUserId();

			if (!uid)
			  return callback('Unable to determine session uid');

			logger.debug('bind session to user '+uid);
			session.bind(uid);

			// disconnect event
			session.on('closed', onUserLeave.bind(null, that.app));

			return callback(null);
		},

		function determineIfFirstClient(callback) {
			// another session already exists on this frontend for this uid?
			var currentUidSessions = that.app.get('sessionService').getByUid(uid);
			if (currentUidSessions && currentUidSessions.length > 1) {
				logger.debug('at least another session exists for this user on this frontend: [%s] [%s] (firstClient=false)', session.uid, session.frontendId);
				firstClient = false;
				return callback(null);
			}

			// search for session on other frontends
			that.app.statusService.getSidsByUid(uid, function(err, sids) {
				if (err)
					return callback('Error while retrieving user status: '+err);

				if (sids && sids.length > 0) {
				  _.each(sids, function(sid) {
						if (sid != session.frontendId) {
							firstClient = false;
						}
					});
				}

				return callback(null);
			});
		},

		function welcomeMessage(callback) {
			if (!that.app.rpc.chat)
				return callback('app.rpc.chat not already exists, server is not ready');

			// delegate connect logic to 'chat' server and get welcome message in return
		  return that.app.rpc.chat.welcomeRemote.getMessage(
				session,
				uid,
				session.frontendId,
				callback
			);
		},

		function declareIdentity(welcome, callback) {
			// add username in connection monitoring
			that.app.components.__connection__.updateUserInfo(uid, {
				username: welcome.user.username,
				remote: session.__session__.__socket__.socket.handshake.address,
				server: session.__session__.__socket__.socket.handshake.headers.host
			});

			// add session unique ID (tracking)
			session.set('uuid', uuid.v1());

			// add username, avatar, color and admin flag on session
			session.set('username', welcome.user.username);
			session.set('avatar', welcome.user.avatar);
			session.set('color', welcome.user.color);
			session.set('started', Date.now());
			if (welcome.user.admin === true)
			  session.set('admin', true);

			session.pushAll(function(err) {
				if (err)
				  return callback('Error while updating session infos: '+err);
				return callback(null, welcome);
			});
		},

		function subscribeRoomChannels(welcome, callback) {
			if (!welcome.rooms || welcome.rooms.length < 1)
				return callback(null, welcome);

			var parallels = [];
			_.each(welcome.rooms, function(room) {
				var name = room.name;
				parallels.push(function(fn) {
					that.app.globalChannelService.add(name, uid, session.frontendId, function(err) {
						if (err)
							return fn('Error while registering user in room channel: '+err);

						return fn(null, name);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while registering user in rooms channels: '+err);

				return callback(null, welcome);
			});
		},

		function subscribeUserChannel(welcome, callback) {
			that.app.globalChannelService.add(USER_CHANNEL_PREFIX+uid, uid, session.frontendId, function(err) {
				if (err)
					return callback('Error while registering user in user channel: '+err);

				return callback(null, welcome);
			});
		},

		function subscribeGlobalChannel(welcome, callback) {
			that.app.globalChannelService.add(GLOBAL_CHANNEL_NAME, uid, session.frontendId, function(err) {
				if (err)
					return callback('Error while registering user in global channel: '+err);

				return callback(null, welcome);
			});
		},

		function tracking(welcome, callback) {
			var _socket = session.__session__.__socket__.socket;
			var sessionEvent = {
				session: {
					id: session.settings.uuid,
					connector: session.frontendId,
					device: _socket.handshake.query.device || 'unknown',
					ip: _socket.handshake.headers['x-forwarded-for'] || _socket.handshake.address
				},
				user: {
					id: uid,
					username: session.settings.username,
					admin: (session.settings.admin === true)
				}
			};
			keenio.addEvent("session_start", sessionEvent, function(err, res){
				if (err)
				  logger.error('Error while tracking session_start in keen.io for '+uid+': '+err);

				return callback(null, welcome);
			});
		},

		function sendUserOnline(welcome, callback) {
			if (!firstClient)
			  return callback(null, welcome);

			that.app.rpc.chat.statusRemote.online(
				session,
				uid,
				welcome,
				function(err) {
					if (err)
						logger.error('Error while statusRemote.online: '+err);
				}
			);

			// don't wait for response before continuing
			return callback(null, welcome);
		}

	], function(err, welcome) {
		if (err) {
			logger.error(err);
			return next(null, { code: 500, error: true, msg: err });
		}

		return next(null, welcome);
	});
};

/**
 * User logout handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session, reason) {
	if(!session || !session.uid)
		return; // could happen if a uid was not already bound before disconnect (crash, bug, debug session, ...)

	var duration = Math.ceil((Date.now() - session.settings.started)/1000); // seconds

	// Keen.io tracking
	var _socket = session.__session__.__socket__.socket;
	var sessionEvent = {
		session: {
			id: session.settings.uuid,
			connector: session.frontendId,
			device: _socket.handshake.query.device || 'unknown',
			ip: _socket.handshake.headers['x-forwarded-for'] || _socket.handshake.address,
			duration: duration
		},
		user: {
			id: session.uid,
			username: session.settings.username,
			admin: (session.settings.admin === true)
		}
	};
	keenio.addEvent("session_end", sessionEvent, function(err, res){
		if (err)
			logger.error('Error while tracking session_end in keen.io for '+uid+': '+err);

		// logger
		var log = {
			event: 'onUserLeave',
			frontendId: session.frontendId,
			time : new Date(),
			session_duration: duration
		};
		if (session.settings.username)
			log.username = session.settings.username;
		if (reason)
			log.reason = reason;
		logger.info(JSON.stringify(log));

		// user:offline
		app.rpc.chat.statusRemote.socketGoesOffline(
				session,
				session.uid,
				function(err) {
					if (err)
						logger.error('Error while statusRemote.socketGoesOffline: '+err);
				}
		);
	});

};
