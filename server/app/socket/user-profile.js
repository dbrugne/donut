var delegate_error = require('./error');
var User = require('../models/user');

module.exports = function(io, socket, data) {
  if (undefined == data.user_id || '' == data.user_id) {
    delegate_error('Invalid user id '+data.user_id, __dirname+'/'+__filename);
    return;
  }

  User.findById(data.user_id, 'username bio location website avatar background', function(err, user) {
    if (err) {
      delegate_error('Unable to retrieve user '+err, __dirname+'/'+__filename);
      return;
    }

    socket.emit('user:profile', {
      user: user
    });
  });

  // @todo: activity

};
