var debug = require('debug')('donut:server:entryHandler');
var async = require('async');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var that = this;

	debug('connect request for '+session.__session__.__socket__.socket.getUserId()+'@'+that.app.get('serverId')+' sessionId: '+session.id);

	async.waterfall([

		function determineUid(callback) {
			var userId = false;
			if (session
				&& session.__session__
				&& session.__session__.__socket__
				&& session.__session__.__socket__.socket)
				userId = session.__session__.__socket__.socket.getUserId();

			if (!userId)
			  return callback('Unable to determine session userId');

			debug('bind session to user '+userId);
			session.bind(userId);

			// disconnect event
			session.on('closed', onUserLeave.bind(null, that.app));

			// @todo : probably some logic to add here regarding multi-devices

			return callback(null, userId);
		},

		/**
		 * @todo : remove connect call
		 * @todo : determine if first socket
		 * @todo : call welcome RPC
		 * @todo : subscribe to global + welcome.rooms
		 * @todo : call status
		 */

		function connect(userId, callback) {
			// delegate connect logic to 'chat' server and get welcome message in
			// return
		  return that.app.rpc.chat.connectRemote.connect(
				session,
				userId,
				that.app.get('serverId'),
				callback
			);
		}

	], function(err, welcome) {
		if (err) {
			debug(err);
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
var onUserLeave = function(app, session) {
	if(!session || !session.uid)
		return debug('WARNING: visibily disconnected called without session or session.uid');

	/**
	 * @todo : remove disconnect call
	 * @todo : determine if last socket
	 * @todo : unsubscribe from global + ??? rooms where he is in (/!\/!\/!\/!\) COMMENT TROUVER LES ROOMS DANS LESQUELS EST INSCRIT CET UTILISATEUR ??? MONGO???
	 * @todo : call status
	 */

	debug('disconnect request for '+session.uid+'@'+app.get('serverId'));
	return app.rpc.chat.disconnectRemote.disconnect(
		session,
		session.uid,
		app.get('serverId'),
		function(err) {
			if (err)
			  debug('Error while disconnecting user: '+err);
		}
	);
};

/**
 * In status control tower change method:
 * - goesOnline => newSocketForUser(uid, sid)
 * - goesOffline => removeSocketForUser(uid, sid)
 */