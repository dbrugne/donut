var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var conf = require('../../../../../config/index');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var roomDataHelper = require('../../../util/roomData');
var oneDataHelper = require('../../../util/oneData');
var featuredRooms = require('../../../util/featuredRooms');

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

	var start = Date.now();

	// welcome event data
	var welcomeEvent = {
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

				if (user.admin === true)
					welcomeEvent.user.admin = true;

				return callback(null, user);
			});
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
					roomDataHelper(that.app, uid, name, function(err, room) {
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

				// remove 'null' records (could happen for room that no longer exist but is still registered on user of for
				// room where user is banned from)
				welcomeEvent.rooms = _.filter(results, function(r) {
					return r !== null;
				});
				return callback(null, user);
			});
		},

		function featured(user, callback) {
			if (!welcomeEvent.user.welcome)
			  return callback(null, user);

			featuredRooms(that.app, function(err, featured) {
				if (err)
				  logger.error('Error while retrieving featured rooms: '+err);

				welcomeEvent.featured = _.first(featured, 4); // keep only n firsts

				return callback(null, user);
			});
		}

	], function (err, user) {
		if (err) {
			logger.error(JSON.stringify({
				route: 'welcomeRemote.welcome',
				result: 'fail',
				uid: uid,
				frontendId: frontendId,
				time: new Date(start)
			}));
		} else {
			logger.debug(JSON.stringify({
				route: 'welcomeRemote.welcome',
				result: 'success',
				username: user.username,
				frontendId: frontendId,
				time: new Date(start),
				timeUsed: (Date.now() - start)
			}));
		}

		return globalCallback(err, welcomeEvent);
	});

};
