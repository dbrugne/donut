var helper = require('./helper');
var User = require('../models/user');

module.exports = {

  success: function(data, accept) {
    // could add ACL check here if needed
    accept(null, true);
    helper.record('authorization:success', '', data);
  },

  fail: function(data, message, error, accept) {
    if(error) {
      throw new Error(message);
    }

    // Test environment only! (allow virtual client connexion opening)
    if (process.env.NODE_ENV == 'dev' || process.env.NODE_ENV == 'test') {
      User.findById(data.query.virtualuserid, function(err, virtualUser) {
        if (err) throw new Error('Error while retrieving virtual user: '+err);
        if (!virtualUser) return console.log('No corresponding virtual user found');
        data['user'] = virtualUser;
        data['logged_in'] = true;
        accept(null, true);
      });
      return;
    }
    // End - Test environment only!

    accept(null, false);

    helper.record('authorization:fail', '', {
      data: data,
      message: message,
      error: error
    });
  }

};