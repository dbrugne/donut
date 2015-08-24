var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var validator = require('validator');
var cloudinary = require('../../../../../shared/util/cloudinary').cloudinary;

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

	var user = session.__currentUser__;
	var room = session.__room__;

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory');

      if (!room)
        return callback('unable to retrieve room: ' + data.name);

      if (!room.isOwner(user.id) && session.settings.admin !== true)
        return callback('this user ' + user.id + ' isn\'t able to update data of ' + data.name);

			return callback(null);
		},

		function validate(callback) {

			// @doc: https://www.npmjs.org/package/validator

			if (!data.data || data.data.length < 1)
				return callback('no data to update');

			var errors = {};
			var sanitized = {};

			// description
			if (_.has(data.data, 'description')) {
				if (!validator.isLength(data.data.description, 0, 200)) {
					errors.description = 'Description should be 200 characters max.';
				} else {
					var description = data.data.description;
					description = validator.stripLow(description, true);
					description = validator.escape(description);
					if (description != room.description)
						sanitized.description = description;
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
					if (website != room.website)
						sanitized.website = website;
				}
			}

			// color
			if (_.has(data.data, 'color')) {
				if (data.data.color != '' && !validator.isHexColor(data.data.color)) {
					errors.color = 'Color should be explained has hexadecimal (e.g.: #FF00AA).';
				} else {
					var color = data.data.color.toLocaleUpperCase();
					if (color != room.color)
						sanitized.color = color;
				}
			}

			if (session.settings.admin === true) {
				// visibility
				if (_.has(data.data, 'visibility')) {
					var visibility = !!data.data.visibility;
					if (room.visibility != visibility)
						sanitized.visibility = !!data.data.visibility;
				}

				// priority
				if (_.has(data.data, 'priority')) {
					if (data.data.priority != '' && !validator.isNumeric(data.data.priority)) {
						errors.color = 'Priority should be explained has number (integer).';
					} else {
						var priority = data.data.priority;
						if (priority != room.priority)
							sanitized.priority = priority;
					}
				}
			}

			var errNum = Object.keys(errors).length;
			if (errNum > 0)
				return callback(JSON.stringify(errors)); // object

			return callback(null, sanitized);
		},

		/**
		 * We receive following fields (e.g.: data.data.avatar):
		 *
		 *  {
     *    public_id: 'jfs0fbpit5ozwnvx4uem',
     *    version: 1407505236,
     *    path: 'v1407505236/jfs0fbpit5ozwnvx4uem.jpg'
     *  }
		 */
		function images(sanitized, callback) {
			if (_.has(data.data, 'avatar')) {
				var avatar = data.data.avatar;

				// new image
				if (avatar.path)
					sanitized.avatar = avatar.path;

				// remove actual image
				if (avatar.remove && avatar.remove == true && room.avatar) {
					sanitized.avatar = '';

					// remove previous picture
					cloudinary.api.delete_resources([room.avatarId()], function(result){
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
				if (poster.remove && poster.remove == true && room.poster) {
					sanitized.poster = '';

					// remove previous picture
					cloudinary.api.delete_resources([room.posterId()], function(result){
						console.log(result.deleted);
					});
				}
			}

			return callback(null, sanitized);
		},

		function update(sanitized, callback) {
			for (var field in sanitized) {
				room.set(field, sanitized[field]);
			}
			room.save(function(err) {
				return callback(err, sanitized);
			});
		},

		function broadcast(sanitized, callback) {
			// notify only certain fields
			var sanitizedToNotify = {};
			var fieldToNotify = ['avatar','poster','color'];
			_.each(Object.keys(sanitized), function(key) {
				if (fieldToNotify.indexOf(key) != -1) {
					if (key == 'avatar')
						sanitizedToNotify['avatar'] = room._avatar();
					else if (key == 'poster') {
						sanitizedToNotify['poster'] = room._poster();
						sanitizedToNotify['posterblured'] = room._poster(true);
					} else {
					  sanitizedToNotify['color'] = sanitized[key];
						// Also update colors of poster & sidebar when no image defined
						if (room.avatar && room.avatar.length == 0)
							sanitizedToNotify['avatar'] = room._avatar();
						if (room.poster && room.poster.length == 0)
							sanitizedToNotify['poster'] = room._poster();
					}
				}
			});

			if (Object.keys(sanitizedToNotify).length < 1)
				return callback(null);

			var event = {
				name: room.name,
				id: room.id,
				data: sanitizedToNotify
			};
			that.app.globalChannelService.pushMessage('connector', 'room:updated', event, room.name, {}, callback);
		}

	], function(err) {
    if (err) {
      logger.error('[room:update] ' + err);
      return next(null, {code: 500, err: err});
    }

		next(null, {});
	});

};