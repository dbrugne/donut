var helper = require('./helper');
var User = require('../app/models/user');

/**
 * Return current user data for account forms (profile and others)
 */

module.exports = function(io, socket, data) {

  User.findById(socket.getUserId(), 'username avatar poster bio location website color general', function(err, user) {
    if (err) return helper.handleError('Unable to retrieve user: '+err);

    var userData = user.toJSON();

    // user_id
    userData.user_id = userData._id;
    delete userData._id;

    // avatar
    userData.avatar = user.avatarUrl('medium');
    userData.avatar_raw = user.avatar;

    // poster
    userData.poster = user.posterUrl();
    userData.poster_raw = user.poster;

    socket.emit('user:read', userData);

    // Activity
    helper.record('user:read', socket, {username: userData.username});

  });

};
