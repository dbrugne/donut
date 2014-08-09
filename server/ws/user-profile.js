var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {
  if (undefined == data.user_id || '' == data.user_id)
    return helper.handleError('Invalid user id '+data.user_id);

  User.findById(data.user_id, 'username avatar poster bio location website color', function(err, user) {
    if (err) return helper.handleError('Unable to retrieve user: '+err);

    var userData = user.toJSON();

    // user_id
    userData.user_id = userData._id;
    delete userData._id;
    // avatar
    userData.avatar = user.avatar;
    // status
    userData.status = (helper.userSockets(io, user._id).length > 0)
      ? 'online'
      : 'offline';

    socket.emit('user:profile', {
      user: userData
    });

    // Activity
    helper.record('user:profile', socket, data);

  });

};
