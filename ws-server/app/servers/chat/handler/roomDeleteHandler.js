var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');

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
			if (!data.room_id)
				return callback('id is mandatory');

      if (!room)
        return callback('unable to retrieve room: ' + data.room_id);

      if (!room.isOwner(user.id) && session.settings.admin !== true)
        return callback(user.id + ' is not allowed to delete ' + data.room_id);

      if (room.permanent === true)
        return callback('permanent');

			return callback(null);
		},

		function kick(callback) {
			var event = {
				name: room.name,
				id: room.id,
				room_id: room.id,
				reason: 'deleted'
			};
			that.app.globalChannelService.pushMessage('connector', 'room:leave', event, room.name, {}, function(err) {
				if (err)
					logger.error(err); // not 'return', we delete even if error happen
        return callback(null);
			});
		},

    function destroy(callback) {
      that.app.globalChannelService.destroyChannel(room.name, function(err) {
        if (err)
          logger.error(err); // not 'return', we continue even if error happen
        return callback(null);
      });
    },

		function persist(callback) {
			room.deleted = true;
			room.save(callback);
		}

	], function(err) {
		if (err) {
			logger.error('[room:delete] ' + err);
			return next(null, {code: 500, err: err});
		}

		next(null, {success: true});
	});

};