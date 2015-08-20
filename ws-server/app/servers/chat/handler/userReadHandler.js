var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');

var Handler = function(app) {
	this.app = app;
};

module.exports = function(app) {
	return new Handler(app);
};

var handler = Handler.prototype;

handler.read = function(data, session, next) {

	var user = session.__currentUser__;
	var readUser = session.__user__;

  var read = {};

	var that = this;

	async.waterfall([

		function check(callback) {
			if (!data.username)
				return callback('invalid-username');

      if (!readUser)
        return callback('unknown');

			return callback(null);
		},

    function details(callback) {
      read.user_id   	 = readUser.id;
      read.username  	 = readUser.username;
      read.color     	 = readUser.color;
      read.avatar    	 = readUser._avatar();
      read.poster    	 = readUser._poster();
      read.bio       	 = readUser.bio;
      read.location  	 = readUser.location;
      read.website   	 = readUser.website;
      read.registered	 = readUser.created_at;
      read.banned      = user.isBanned(readUser.id); // for ban/deban menu
      read.i_am_banned = readUser.isBanned(user.id); // for input enable/disable
      return callback(null);
    },

    function status(callback) {
      that.app.statusService.getStatusByUid(readUser.id, function(err, status) {
        if (err)
          return callback(err);

        if (status) {
          read.status = 'online';
          read.onlined = user.lastonline_at;
        } else {
          read.status = 'offline';
          user.onlined = user.lastoffline_at;
        }
        return callback(null);
      });
    },

    function rooms(callback) {
      Room.find({
        deleted: { $ne: true },
        $or: [
          { owner: readUser._id },
          { op: { $in: [readUser._id] } },
          { users: { $in: [readUser._id] } }
        ]
      }, 'name avatar color owner op users').exec(function (err, models) {
        if (err)
          return callback(err);

        read.rooms = {
          owned: [],
          oped: [],
          joined: []
        };
        _.each(models, function(room) {
          var _room = {
            name	: room.name,
            id		: room.id,
            avatar: room._avatar()
          };

          if (room.owner == readUser.id)
            read.rooms.owned.push(_room);
          else if (room.op.length && room.op.indexOf(readUser._id) !== -1)
            read.rooms.oped.push(_room);
          else
            read.rooms.joined.push(_room);
        });

        return callback(null);
      });
    },

		function account(callback) {
			if (readUser.id != user.id)
			  return callback(null);

      read.account = {};

			// email
			if (readUser.local && readUser.local.email)
        read.account.email = readUser.local.email;

			// facebook
			if (readUser.facebook && readUser.facebook.id) {
        read.account.facebook = {
					id: readUser.facebook.id,
					token: (readUser.facebook.token) ? 'yes' : '',
					email: readUser.facebook.email,
					name: readUser.facebook.name
				};
			}
			return callback(null);
		}

	], function(err) {
    if (err) {
      logger.error('[user:read] ' + err);

      err = (['invalid-username', 'unknown'].indexOf(err) !== -1)
        ? err
        : 'internal';
      return next(null, { code: 500, err: err });
    }

		return next(null, read);
	});

};