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

	debug('connect request for '+session.__session__.__socket__.socket.getUserId()+'@'+that.app.get('serverId'));

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

			//if(!!that.app.get('sessionService').getByUid(userId))
			//	return callback("User already logged in with userId (it's a problem??)"); // @todo : probably useless

			// @todo : probably some logic to add here regarding multi-devices

			return callback(null, userId);
		},

		function sessionBinding(userId, callback) {
			debug('bind session to user '+userId);
			session.bind(userId);

			// events
			session.on('closed', onUserLeave.bind(null, that.app));

			return callback(null, userId);
		},

		function connect(userId, callback) {
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

	debug('disconnect request for '+session.uid+'@'+app.get('serverId'));
	return app.rpc.chat.disconnectRemote.connect(
		session,
		session.uid,
		app.get('serverId'),
		function(err) {
			if (err)
			  debug('Error while disconnecting user: '+err);
		}
	);
};