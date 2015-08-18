var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:input');
var async = require('async');
var _ = require('underscore');
var sanitize = {
	'html': require('sanitize-html'),
	'caja': require('sanitize-caja')
};
var RoomModel = require('../../../shared/models/room');
var UserModel = require('../../../shared/models/user');
var common = require('donut-common');

/**
 * Check for maximal length, sanitize and escape input
 * Return filtered string or empty string if too long or empty.
 * @param value
 * @param max
 * @return false or filtered String
 */
module.exports.filter = function(value, maxLength) {
  // check length
	maxLength = maxLength || 512;
	// @todo : add without smileys code count
	if (value.length < 1 || value.length > maxLength)
	  return false;

	var filtered;
	filtered = value.replace('<3', '#!#!#heart#!#!#').replace('</3', '#!#!#bheart#!#!#'); // very common but particular case
	filtered = sanitize.html(filtered, {
		allowedTags        : {},
		allowedAttributes  : {}
	});
	filtered = sanitize.caja(filtered);
	filtered = value.replace('#!#!#heart#!#!#', '<3').replace('#!#!#bheart#!#!#', '</3');

	if (filtered == '')
	  return false;

	return filtered;
	/**
	 * Test string :
	 *
	 * words are :P >B) <3 </3 :) but style is still <strong>enabled</strong>, and <a href="http://google.com">links</a>. Or www.google.com and http://yahoo.fr/ with an XSS <script>alert('go go go!')</script>
	 */
};

module.exports.mentions = function(string, callback) {

  if (!string || string === '')
    return callback(null, string, {});

  common.markupString(string, function(markups, fn) {
    if (!markups.rooms.length && !markups.users.length)
      return fn(null, markups);

    async.parallel([

      function(cb) {
        if (!markups.rooms.length)
          return cb(null);

        var _rooms = _.uniq(_.map(markups.rooms, function(r) {
          return '#' + r.name;
        }));
        RoomModel.listByName(_rooms).exec(cb);
      },

      function(cb) {
        if (!markups.users.length)
          return cb(null);

        var _users = _.uniq(_.map(markups.users, function(u) {
          return u.username;
        }));
        UserModel.listByUsername(_users).exec(cb);
      }

    ], function(err, results) {
      if (err)
        return fn(err);

      var rooms = [];
      _.each(markups.rooms, function(markup) {
        var model = _.find(results[0], function(m) {
          return ('#' + markup.name.toLocaleLowerCase() === m.name.toLocaleLowerCase());
        });
        if (!model)
          return;
        markup.id = model.id;
        rooms.push(markup);
      });
      var users = [];
      _.each(markups.users, function(markup) {
        var model = _.find(results[1], function(m) {
          return (markup.username.toLocaleLowerCase() === m.username.toLocaleLowerCase());
        });
        if (!model)
          return;
        markup.id = model.id;
        users.push(markup);
      });

      markups.rooms = rooms;
      markups.users = users;
      return fn(null, markups);
    });
  }, callback);
};
