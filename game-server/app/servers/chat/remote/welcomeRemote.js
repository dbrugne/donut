var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../shared/config/index');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var roomDataHelper = require('../../../util/roomData');
var oneDataHelper = require('../../../util/oneData');
var hello = require('../../../util/helloDolly');

module.exports = function(app) {
	return new WelcomeRemote(app);
};

var WelcomeRemote = function(app) {
	this.app = app;
};

/**
 * Return the welcome message event for a given user:
 * - user details
 * - rooms where he is in details with short piece of history
 * - opened onetoones  details with short piece of history
 *
 * @param {String} uid unique id for user
 */
WelcomeRemote.prototype.getMessage = function(uid, frontendId, globalCallback) {

	logger.debug('welcome message call for '+uid+'@'+frontendId);

	// welcome event data
	var welcomeEvent = {
		hello: hello(),
		autojoined: false // was this user added to #donut during the autojoin logic?
	};

	var that = this;

	async.waterfall([

		function retrieveUser(callback){
			var q = User.findById(uid);
			q.populate('onetoones', 'username');
			q.exec(function(err, user) {
				if (err)
					return callback('Unable to find user: '+err, null);

				// welcome message is displayed until user hasn't check the box
				var welcomeMessage = (user.welcome === true || user.welcome == undefined)
					? true
					: false;

				welcomeEvent.user = {
					user_id: user._id.toString(),
					username: user.username,
					avatar: user._avatar(),
					welcome: welcomeMessage
				};

				if (user.positions)
				  welcomeEvent.user.positions = JSON.parse(user.positions);

				return callback(null, user);
			});
		},

		function donutAutojoin(user, callback) {
			// special case of #donut room autojoin
			if (user.general == true && user.rooms.indexOf(conf.room.general) == -1) {
				User.findOneAndUpdate({_id: user._id}, {$addToSet: { rooms: conf.room.general }}, function(err, user) {
					if (err)
						return callback('Unable to persist #donut on user: '+err);

					Room.findOneAndUpdate({name: conf.room.general}, {$addToSet: {users: user._id}}, function(err) {
						if (err)
							return callback('Unable to persist user on #donut: '+err);

						welcomeEvent.autojoined = true;
						return callback(null, user);
					});
				});
			} else {
				return callback(null, user);
			}
		},

		function populateOnes(user, callback){
			if (user.onetoones.length < 1)
				return callback(null, user);

			var parallels = [];
			_.each(user.onetoones, function(one) {
				if (!one.username)
					return logger.info('Empty username found in populateOnes for user: '+uid);
				parallels.push(function(fn) {
					oneDataHelper(that.app, uid, one.username, {history: false}, function(err, one) {
						if (err)
							return fn(err);
						else
							return fn(null, one);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while populating onetoones: '+err);

				welcomeEvent.onetoones = _.filter(results, function(o) {
					return o !== null;
				});
				return callback(null, user);
			});
		},

		function populateRooms(user, callback) {
			if (user.rooms.length < 1)
				return callback(null, user);

			var parallels = [];
			_.each(user.rooms, function(name) {
				parallels.push(function(fn) {
					roomDataHelper(that.app, uid, name, {history: false}, function(err, room) {
						if (err)
							return fn(err);
						else
							return fn(null, room);
					});
				});
			});
			async.parallel(parallels, function(err, results) {
				if (err)
					return callback('Error while populating rooms: '+err);

				welcomeEvent.rooms = _.filter(results, function(r) {
					return r !== null;
				});
				return callback(null, user);
			});
		}

	], function (err, user) {
		if (err)
			return globalCallback(err);

		logger.debug('welcome message done for '+uid+'@'+frontendId);
		return globalCallback(null, welcomeEvent);
	});

};
