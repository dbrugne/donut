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
			var uid = false;
			if (session
				&& session.__session__
				&& session.__session__.__socket__
				&& session.__session__.__socket__.socket)
				uid = session.__session__.__socket__.socket.getUserId();

			if (!uid)
			  return callback('Unable to determine session UID');

			if(!!that.app.get('sessionService').getByUid(uid))
				return callback("User already logged in with UID (it's a problem??)");

			// @todo : probably some logic to add here regarding multi-devices

			return callback(null, uid);
		},

		function sessionBinding(uid, callback) {
			// uid
			debug('Bound session to user '+uid);
			session.bind(uid);

			// events
			session.on('closed', onUserLeave.bind(null, that.app));

			return callback(null);
		},

		function welcome(callback) {
			var socket = session.__session__.__socket__.socket;
			var welcome = {
				hello: 'salut %u',
				user: {
					user_id: socket.getUserId(),
					username: socket.getUsername(),
					avatar: socket.getAvatar(),
					color: socket.getColor(),
					welcome: true
				},
				rooms: [],
				onetoones: []
			};

			return callback(null, welcome);
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