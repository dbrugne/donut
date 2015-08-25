var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

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

      var roomUser = _.findIndex(room.users, function(u) {
        return (u.id === user.id);
      });
      if (roomUser === -1)
        return callback('this user ' + user.id + ' is not currently in ' + room.name);

			return callback(null);
		},

    function listAndStatus(callback) {
      var usersIds = [];
      var users = _.map(room.users, function(u) {
        usersIds.push(u.id);
        return {
          user_id  : u.id,
          username : u.username,
          avatar   : u._avatar()
        };
      });
      that.app.statusService.getStatusByUids(usersIds, function(err, results) {
        if (err)
          return callback(err);
        _.each(users, function(element, index, list) {
          list[index].status = (results[element.user_id])
            ? 'online'
            : 'offline';
        });
        return callback(null, users);
      });
    }

	], function(err, users) {
    if (err) {
      logger.error('[room:users] ' + err);
      return next(null, {code: 500, err: err});
    }

		return next(null, {
      name: room.name,
      id: room.id,
      users: users
    });
	});

};