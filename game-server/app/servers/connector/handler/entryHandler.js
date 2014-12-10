var logger = require('pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../shared/config/index');

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
			// delegate connect logic to 'chat' server and get welcome message in
			// return
		  return that.app.rpc.chat.welcomeRemote.getMessage(
				session,
				uid,
				session.frontendId,
				callback
			);
		},

		function subscribeRoomChannels(welcome, callback) {
			if (welcome.rooms.length < 1)
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

		function donutAutojoinIn(welcome, callback) {
			if (!welcome.autojoined)
			  return callback(null, welcome);

			// @todo : emit room:in
			return callback(null, welcome);
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
var onUserLeave = function exit(app, session) {
	if(!session || !session.uid)
		return; // could happen if a uid wasn't binded before disconnect (crash, bug, debug session, ...)

	logger.debug('disconnect request for '+session.uid+'@'+app.get('serverId'));

	var that = this;
	var lastClient = false;

	async.waterfall([

		function isLastClient(callback) {
			app.statusService.getStatusByUid(session.uid, function(err, status) {
				if (err)
					return logger.error('Error while retrieving user status: '+err);

				// At least an other socket is live for this user or not
				lastClient = !status;

				return callback(null);
			});
		},

		function sendUserOffline(callback) {
			if (!lastClient)
				return callback(null);

			app.rpc.chat.statusRemote.offline(
				session,
				session.uid,
				function(err) {
					if (err)
						logger.error('Error while statusRemote.offline: '+err);
				}
			);

			// don't wait for response before continuing
			return callback(null);
		}

	], function(err) {
		if (err)
			logger.error('Error while disconnecting user: '+err);
	});

};
