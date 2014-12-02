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

			//// persist data in session
			//session.set('user_id', user._id.toString());
			//session.set('username', user.username);
			//session.set('color', user.color);
			//session.pushAll(function(err) {
			//	if (err)
			//	  return callback(err);

				return callback(null, userId);
			//});
		},

		function welcome(userId, callback) {
		  return that.app.rpc.chat.welcomeRemote.get(
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



	//session.set('rid', rid);
	//session.push('rid', function(err) {
	//	if(err) {
	//		console.error('set rid for session service failed! error is : %j', err.stack);
	//	}
	//});
	// put user into channel
	//that.app.rpc.chat.chatRemote.add(session, uid, that.app.get('serverId'), rid, true, function(users){
	//	next(null, {
	//		users:users
	//	});
	//});
};

/**
 * User logout handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
	if(!session || !session.uid) {
		return;
	}
	//app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), null);
};