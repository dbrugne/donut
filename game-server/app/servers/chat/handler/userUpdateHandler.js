var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var validator = require('validator');
var sanitize = require('sanitize-caja');
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handler user update logic
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

		/**
		 * validate, sanitized and identify field to be update
		 */
		function validate(user, callback) {

			// @doc: https://www.npmjs.org/package/validator

			if (!data.data || data.data.length < 1)
				return callback('No data to update');

			var errors = {};
			var sanitized = {};

			// bio
			if (_.has(data.data, 'bio')) {
				if (!validator.isLength(data.data.bio, 0, 200)) {
					errors.bio = 'Bio should be 200 characters max.';
				} else {
					var bio = data.data.bio;
					bio = validator.stripLow(bio, true);
					bio = sanitize(bio);
					bio = validator.escape(bio);
					if (bio != user.bio)
						sanitized.bio = bio;
				}
			}

			// location
			if (_.has(data.data, 'location')) {
				if (!validator.isLength(data.data.location, 0, 70)) {
					errors.location = 'Location should be 70 characters max.';
				} else {
					var location = data.data.location;
					location = validator.trim(location);
					location = validator.escape(location);
					if (location != user.location)
						sanitized.location = location;
				}
			}

			// website
			if (_.has(data.data, 'website')) {
				var opts = {
					require_protocol: false,
					require_tld: true,
					allow_underscores: true
				};
				if (data.data.website != '' && !validator.isURL(data.data.website, opts)) {
					errors.website = 'Website should be a valid site URL';
				} else {
					var website = data.data.website;
					website = validator.trim(website);
					website = validator.escape(website);
					if (website != user.website)
						sanitized.website = website;
				}
			}

			// color
			if (_.has(data.data, 'color')) {
				if (data.data.color != '' && !validator.isHexColor(data.data.color)) {
					errors.color = 'Color should be explained has hexadecimal (e.g.: #FF00AA).';
				} else {
					var color = data.data.color.toLocaleUpperCase();
					if (color != user.color)
						sanitized.color = color;
				}
			}

			// general
			if (_.has(data.data, 'general')) {
				var general = validator.toBoolean(data.data.general);
				if (general != user.general)
					sanitized.general = general;
			}

			// welcome
			if (_.has(data.data, 'welcome')) {
				var welcome = validator.toBoolean(data.data.welcome);
				if (welcome != user.welcome)
					sanitized.welcome = welcome;
			}

			// positions
			if (_.has(data.data, 'positions')) {
				var welcome = validator.toBoolean(data.data.welcome);
				if (welcome != user.welcome)
					sanitized.welcome = welcome;

				if (!_.isArray(data.data.positions)) {
					errors.positions = 'Positions should be an array';
				} else {
					sanitized.positions = JSON.stringify(data.data.positions);
				}
			}

			var errNum = Object.keys(errors).length;
			if (errNum > 0)
				return callback(errors); // object

			return callback(null, user, sanitized);
		},

		/**
		 * We receive following fields (e.g.: data.data.avatar):
		 *
		 *  {
       *    public_id: 'jfs0fbpit5ozwnvx4uem',
       *    version: 1407505236,
       *    path: 'v1407505236/jfs0fbpit5ozwnvx4uem.jpg'
       *  }
		 *
		 * As $.cloudinary can build URL based on 'path' (that contain both public_id
		 * and version) we store only 'path' as model 'avatar' field value:
		 *
		 *   $.cloudinary.url("v1407505236/jfs0fbpit5ozwnvx4uem.jpg")
		 *   -> "http://res.cloudinary.com/roomly/image/upload/v1407505236/jfs0fbpit5ozwnvx4uem.jpg"
		 */
		function images(user, sanitized, callback) {
			if (_.has(data.data, 'avatar')) {
				var avatar = data.data.avatar;

				// new image
				if (avatar.path)
					sanitized.avatar = avatar.path;

				// remove actual image
				if (avatar.remove && avatar.remove == true && user.avatar) {
					sanitized.avatar = '';

					// remove previous picture from cloudinary?
					cloudinary.api.delete_resources([user.avatarId()], function(result){
						console.log(result.deleted);
					});
				}
			}

			if (_.has(data.data, 'poster')) {
				var poster = data.data.poster;

				// new image
				if (poster.path)
					sanitized.poster = poster.path;

				// remove actual image
				if (poster.remove && poster.remove == true && user.poster) {
					sanitized.poster = '';

					// remove previous picture from cloudinary?
					cloudinary.api.delete_resources([user.posterId()], function(result){
						console.log(result.deleted);
					});
				}
			}

			return callback(null, user, sanitized);
		},

		function update(user, sanitized, callback) {
			for (var field in sanitized) {
				user.set(field, sanitized[field]);
			}
			user.save(function(err) {
				if (err)
					return callback('Error when saving user "'+user.username+'": '+err);

				return callback(null, user, sanitized);
			});
		},

		function broadcastUser(user, sanitized, callback) {
			// notify only certain fields
			var sanitizedToNotify = {};
			var fieldToNotify = ['avatar','positions'];
			_.each(Object.keys(sanitized), function(key) {
				if (fieldToNotify.indexOf(key) != -1) {
					if (key == 'avatar')
						sanitizedToNotify[key] = user._avatar();
					else if (key == 'positions')
					  sanitizedToNotify[key] = JSON.parse(sanitized[key]);
					else
						sanitizedToNotify[key] = sanitized[key];
				}
			});

			if (Object.keys(sanitizedToNotify).length < 1)
				return callback(null, user, sanitized); // nothing to notify

			var event = {
				username: user.username,
				data: sanitizedToNotify
			};

			// inform user
			that.app.globalChannelService.pushMessage('connector', 'user:updated', event, 'user:'+user._id.toString(), {}, function(err) {
				if (err)
					logger.error('Error while pushing user:updated message to '+user._id.toString()+' on user:update: '+err);
			});

			return callback(null, user, sanitized);
		},

		function broadcastOthers(user, sanitized, callback) {
			// notify only certain fields
			var sanitizedToNotify = {};
			var fieldToNotify = ['avatar','poster','color'];
			_.each(Object.keys(sanitized), function(key) {
				if (fieldToNotify.indexOf(key) != -1) {
					if (key == 'avatar')
						sanitizedToNotify[key] = user._avatar();
					else if (key == 'poster')
					  sanitizedToNotify[key] = user._poster();
					else
					  sanitizedToNotify[key] = sanitized[key];
				}
			});

			if (Object.keys(sanitizedToNotify).length < 1)
				return callback(null, user, sanitized); // nothing to notify

			var event = {
				username: user.username,
				data: sanitizedToNotify
			};

			// inform rooms
			if (user.rooms && user.rooms.length > 0) {
				_.each(user.rooms, function(roomName) {
					that.app.globalChannelService.pushMessage('connector', 'user:updated', event, roomName, {}, function(err) {
						if (err)
							logger.error('Error while pushing user:updated message to '+roomName+' on user:update: '+err);
					});
				});
			}

			// inform onetoones
			if (user.onetoones && user.onetoones.length > 0) {
				_.each(user.onetoones, function(userId) {
					that.app.globalChannelService.pushMessage('connector', 'user:updated', event, 'user:'+userId, {}, function(err) {
						if (err)
							logger.error('Error while pushing user:updated message to '+userId+' on user:update: '+err);
					});
				});
			}

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