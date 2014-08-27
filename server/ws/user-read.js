var helper = require('./helper');
var User = require('../app/models/user');

/**
 * Return current user data for account forms (profile and others)
 */

module.exports = function(io, socket, data) {

  User.findById(socket.getUserId(), 'username avatar poster bio location website color general local facebook', function(err, user) {
    if (err) return helper.handleError('Unable to retrieve user: '+err);

    var event = {
      user_id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      poster: user.poster,
      color: user.color,
      bio: user.bio,
      location: user.location,
      website: user.website,
      general: user.general
    };

    if (user.local && user.local.email)
      event.email = user.local.email;

    if (user.facebook)
      event.facebook = {
        id: user.facebook.id,
        token: user.facebook.token,
        email: user.facebook.email,
        name: user.facebook.name
      };

    socket.emit('user:read', event);

    // Activity
    helper.record('user:read', socket, {username: event.username});

  });

};
