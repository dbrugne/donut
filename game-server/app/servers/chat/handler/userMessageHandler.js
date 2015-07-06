var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');
var oneEmitter = require('../../../util/oneEmitter');
var inputUtil = require('../../../util/input');
var imagesUtil = require('../../../util/images');
var keenio = require('../../../../../shared/io/keenio');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle onetoone message logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param {Function} next stemp callback
 *
 */
handler.message = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('username is mandatory for user:message');

			if (!User.validateUsername(data.username))
				return callback('Invalid user username on user:message: '+data.username);

			return callback(null);
		},

		function retrieveFromUser(callback) {
			User.findByUid(session.uid).exec(function (err, from) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:message: '+err);

				if (!from)
					return callback('Unable to retrieve user in user:message: '+session.uid);

				return callback(null, from);
			});
		},

		function retrieveToUser(from, callback) {
			User.findByUsername(data.username).exec(function (err, to) {
				if (err)
					return callback('Error while retrieving user '+data.username+' in user:message: '+err);

				if (!to)
					return callback('Unable to retrieve user in user:message: '+data.username);

				return callback(null, from, to);
			});
		},

		function persistOnBoth(from, to, callback) {
			from.update({$addToSet: { onetoones: to._id }}, function(err) {
				if (err)
					return callback('Unable to persist ($addToSet) onetoones on "from" user: '+err);

				to.update({$addToSet: { onetoones: from._id }}, function(err) {
					if (err)
						return callback('Unable to persist ($addToSet) onetoones on "to" user: '+err);

					return callback(null, from, to);
				});
			});
		},

		function prepareEvent(from, to, callback) {
			// text filtering
			var message = inputUtil.filter(data.message, 512);

			// images filtering
			var images = imagesUtil.filter(data.images);

			if (!message && !images)
				return callback('Empty message (no text, no image)');

			var event = {
				from_user_id  : from._id.toString(),
				from_username : from.username,
				from_avatar   : from._avatar(),
				to_user_id    : to._id.toString(),
				to_username   : to.username,
				time          : Date.now()
			};

			if (message)
				event.message = message;
			if (images && images.length)
				event.images = images;

			return callback(null, from, to, event);
		},

		function historizeAndEmit(from, to, event, callback) {
			oneEmitter(that.app, {from: from._id, to: to._id}, 'user:message', event, function(err, sentEvent) {
				if (err)
					return callback(err);

				return callback(null, from, to, sentEvent);
			});
		},

		function notification(from, to, event, callback) {
			Notifications(that.app).create('usermessage', to, event, function() {
				return callback(null, from, to, event);
			});
		},

		function tracking(from, to, event, callback) {
			var messageEvent = {
				session: {
					id: session.settings.uuid,
					connector: session.frontendId
				},
				user: {
					id: session.uid,
					username: session.settings.username,
					admin: (session.settings.admin === true)
				},
				to: {
					id: to._id.toString(),
					username: to.username,
					admin: (to.admin === true)
				},
				message: {
					length: event.message.length,
					images: (event.images && event.images.length) ? event.images.length : 0
				}
			};
			keenio.addEvent("onetoone_message", messageEvent, function(err){
				if (err)
					logger.error('Error while tracking onetoone_message in keen.io for '+session.uid+': '+err);

				return callback(null);
			});
		}

	], function(err) {
		if (err)
			logger.error(err);

		next(null); // even for .notify
	});

};