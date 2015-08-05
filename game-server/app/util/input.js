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
	var mentions = common.findRawMentions(string);

  if (!mentions.length)
    return callback(null, string);

  var rooms = [];
  var users = [];
  _.each(mentions, function(m) {
    if (m.match.substr(0, 1) === '#')
      rooms.push(m.match);
    else if (m.match.substr(0, 1) === '@')
      users.push(m.match.replace('@', ''));
  });

  if (!rooms.length && !users.length)
    return callback(null, string);

  rooms = _.uniq(rooms);
  users = _.uniq(users);

  async.parallel([

    function(callback) {
      if (!rooms.length)
        return callback(null);
      RoomModel.listByName(rooms).exec(callback);
    },

    function(callback) {
      if (!users.length)
        return callback(null);
      UserModel.listByUsername(users).exec(callback);
    }

  ], function(err, results) {
    if (err)
      return callback(err);

    var mentionsList = {
      rooms: [],
      users: []
    };
    _.each(mentions, function(m) {
      if (m.match.substr(0, 1) === '#') {

        var room = _.find(results[0], function(s) {
          return (s.name.toLocaleLowerCase() === m.match.toLocaleLowerCase());
        });
        if (!room)
          return;

        // replace with [#:ObjectId():NAME])
        string = common.markupMentions(string, m.match, room.id, room.name);
        m.name = room.name;
        m.room_id = room.id;
        mentionsList.rooms.push(m);

      } else if (m.match.substr(0, 1) === '@') {

        var user = _.find(results[1], function(s) {
          return ('@'+s.username.toLocaleLowerCase() === m.match.toLocaleLowerCase());
        });
        if (!user)
          return;

        // replace with [@:ObjectId():USERNAME]
        string = common.markupMentions(string, m.match, user.id, user.username);
        m.username = user.username;
        m.user_id = user.id;
        mentionsList.users.push(m);

      }
    });

    return callback(null, string, mentionsList);
  });
};
