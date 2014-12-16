var logger = require('pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
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
 * Description
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.update = function(data, session, next) {

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('name is mandatory for room:update');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:update: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:update: '+data.name);

				if (!room.isOwner(session.uid))
					return callback('This user '+session.uid+' isn\'t able to update data of '+data.name);

				return callback(null, room);
			});
		},

		/**
		 * validate, sanitized and identify field to be update
		 */
		function validate(room, callback) {

			// @doc: https://www.npmjs.org/package/validator

			if (!data.data || data.data.length < 1)
				return callback('No data to update');

			var errors = {};
			var sanitized = {};

			// description
			if (_.has(data.data, 'description')) {
				if (!validator.isLength(data.data.description, 0, 200)) {
					errors.description = 'Description should be 200 characters max.';
				} else {
					var description = data.data.description;
					description = validator.stripLow(description, true);
					description = sanitize(description);
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

			var errNum = Object.keys(errors).length;
			if (errNum > 0)
				return callback(errors); // object

			return callback(null, room, sanitized);
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
		function images(room, sanitized, callback) {
			if (_.has(data.data, 'avatar')) {
				var avatar = data.data.avatar;

				// new image
				if (avatar.path)
					sanitized.avatar = avatar.path;

				// remove actual image
				if (avatar.remove && avatar.remove == true && room.avatar) {
					sanitized.avatar = '';

					// remove previous picture from cloudinary?
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

					// remove previous picture from cloudinary?
					cloudinary.api.delete_resources([room.posterId()], function(result){
						console.log(result.deleted);
					});
				}
			}

			return callback(null, room, sanitized);
		},

		function update(room, sanitized, callback) {
			for (var field in sanitized) {
				room.set(field, sanitized[field]);
			}
			room.save(function(err) {
				if (err)
					return callback('Error when saving room "'+room.name+'": '+err);

				return callback(null, room, sanitized);
			});

		},

		function broadcast(room, sanitized, callback) {
			// notify only certain fields
			var sanitizedToNotify = {};
			var fieldToNotify = ['avatar','poster','color'];
			_.each(Object.keys(sanitized), function(key) {
				if (fieldToNotify.indexOf(key) != -1) {
					sanitizedToNotify[key] = sanitized[key];
				}
			});

			if (Object.keys(sanitizedToNotify).length < 1)
				return callback(null, room, sanitized);

			var event = {
				name: room.name,
				data: sanitizedToNotify
			};
			that.app.globalChannelService.pushMessage('connector', 'room:updated', event, room.name, {}, function(err) {
				if (err)
					logger.error('Error while pushing room:updated message to '+room.name+' on room:update: '+err); // not 'return', we delete even if error happen

				return callback(null);
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		// @todo restore log

		next(null, {});
	});

};