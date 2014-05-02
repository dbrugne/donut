var delegate_error = require('./error');
var User = require('../models/user');

/****
 * IS THIS EVENT USED FOR ANYTHING ?????
 */

module.exports = function(io, socket, data) {

  if (undefined == data.user_id || '' == data.user_id) {
    delegate_error('Empty user identifier', __dirname+'/'+__filename);
    return;
  } // @todo : check user_id validity

  // @todo : persist?
//  // persist
//  User.update({
//    _id: socket.getUserId()
//  },{
//    $pull: { onetoones: data.user_id }
//  }, function(err, numberAffected) {
//    if (err) {
//      delegate_error('Unable to update user', __dirname+'/'+__filename);
//      return;
//    }

    // @todo : other devices
    // @todo : activity
//  });

};
