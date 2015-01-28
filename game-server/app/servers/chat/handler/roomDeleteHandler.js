var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var log = require('../../../../../shared/models/log');
var async = require('async');
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');
var i18next = require('../../../../../shared/util/i18next');
var Room = require('../../../../../shared/models/room');
var User = require('../../../../../shared/models/user');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room delete logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.delete = function(data, session, next) {

	var start = log.start();

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.name)
				return callback('room:delete require room name param');

			return callback(null);
		},

		function retrieveRoom(callback) {
			Room.findByName(data.name).exec(function (err, room) {
				if (err)
					return callback('Error while retrieving room in room:delete: '+err);

				if (!room)
					return callback('Unable to retrieve room in room:delete: '+data.name);

				if (!room.isOwnerOrOp(session.uid))
					return callback('This user '+session.uid+' isn\'t able to op another user in this room: '+data.name);

				return callback(null, room);
			});
		},

		function permissions(room, callback) {
			if (!room.isOwner(session.uid))
				return callback('Current user "'+session.uid+'" is not allowed'
				+' to delete this room "'+data.name);

			if (room.permanent == true) {
				var err = i18next.t("edit.room.delete.error.permanent");
				return callback(err);
			}

			return callback(null, room);
		},

		function images(room, callback) {
			// remove pictures from cloudinary
			var images = [];

			if (room.avatarId())
				images.push(room.avatarId());

			if (room.posterId())
				images.push(room.posterId());

			if (images.length > 0) {
				cloudinary.api.delete_resources(images, function(result){
					logger.info('room:delete pictures deletion: ', result.deleted);
				});
			}

			return callback(null, room);
		},

		function kickThemAll(room, callback) {
			// make them leave room
			var event = {
				name: room.name,
				reason: 'deleted'
			};

			that.app.globalChannelService.pushMessage('connector', 'room:leave', event, room.name, {}, function(err) {
				if (err)
					logger.error('Error while pushing room:leave message to '+room.name+' on room:delete: '+err); // not 'return', we delete even if error happen

				that.app.globalChannelService.destroyChannel(room.name, function(err) {
					if (err)
						logger.error('Error while destroying '+room.name+' globalChannel on room:delete: '+err); // not 'return', we continue even if error happen

					return callback(null, room);
				});
			});
		},

		function updateUsers(room, callback) {
			User.update({rooms: {$in: [room.name]}}, {$pull: {rooms: room.name}}, {multi: true}, function(err) {
				if (err)
					return callback('Error while deleting room '+room.name+' on users in Mongo: '+err);

				return callback(null, room);
			});
		},

		function deleteRoom(room, callback) {
			var _room = { name: room.name };
			room.remove(function(err) {
				if (err)
					return callback('Error while delete room '+room.name+' in Mongo: '+err);

				return callback(null, _room); // Javascript object instead Mongoose model
			});
		}

	], function(err) {
		if (err) {
			logger.error(err);
			return next(null, {code: 500, err: err});
		}

		log.activity('room:delete', session.uid, data.name, start);

		next(null, {success: true});
	});

};