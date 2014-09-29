var helper = require('./helper');
var User = require('../app/models/user');

module.exports = {

  success: function(data, accept) {
    // could add ACL check here if needed
    accept();
    helper.record('authorization:success', '', data);
  },

  fail: function(data, message, error, accept) {
    if(error)
      accept(new Error("Error in autorization:fail: "+message));

    // Non-production environment only! (allow virtual client connexion opening)
    if (data._query.virtualuserid && process.env.NODE_ENV != 'production') {
      User.findById(data._query.virtualuserid, function(err, virtualUser) {
        if (err)
          accept(new Error('Error while retrieving virtual user: '+err));
        if (!virtualUser) {
          var errMsg = 'No corresponding virtual user found, refuse connection';
          console.log(errMsg);
          accept(new Error(errMsg));
        }
        data['user'] = virtualUser;
        data['logged_in'] = true;
        accept();
      });
      return;
    }
    // End - Non-production environments only!

    accept(new Error('notlogged')); // String tested on client side to fire browser redirect

    helper.record('authorization:fail', '', {
      data: data,
      message: message,
      error: error
    });
  }

};