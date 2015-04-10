var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var validator = require('validator');
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handler user update preferences logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.update = function(data, session, next) {

	var that = this;

	async.waterfall([

		function retrieveUser(callback) {
			User.findByUid(session.uid).exec(function (err, user) {
				if (err)
					return callback('Error while retrieving user '+session.uid+' in user:update: '+err);

				if (!user)
					return callback('Unable to retrieve user in user:update: '+session.uid);

				return callback(null, user);
			});
		},

		function validate(user, callback) {

			// @doc: https://www.npmjs.org/package/validator

			if (!data.data || data.data.length < 1)
				return callback('No data to update');

			if (data.data.length > 1)
				return callback('Too many data to update (max. 1)');

			// key
			var keys = Object.keys(data.data);
			var key = keys[0];
			if (!(/^[a-z0-9]+[-a-z0-9:]+[a-z0-9]+$/i).test(key))
				return callback('invalidkey');

			// value
			var value = validator.toBoolean(data.data[key]);
			if (user.preferences && user.preferences[key] == value)
				return callback('samevalue');

			return callback(null, user, key, value);
		},

		function update(user, key, value, callback) {
			user.set('preferences.'+key, value);
			user.save(function(err) {
				if (err)
					return callback('Error when saving user preference "'+key+"' on '"+user.username+'": '+err);

				return callback(null, user, key, value);
			});
		},

		function broadcastUser(user, key, value, callback) {
			// notify only certain fields
			var fieldToNotify = ['browser:sound'];
			if (fieldToNotify.indexOf(key) === -1)
			  return callback(null);

			var event = {};
			event[key] = value;

			// inform user
			that.app.globalChannelService.pushMessage('connector', 'user:preferences', event, 'user:'+user._id.toString(), {}, function(err) {
				if (err)
					logger.error('Error while pushing user:preferences message to '+user._id.toString()+' on user:preferences:update: '+err);
			});

			return callback(null);
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		next(null, {});
	});

};