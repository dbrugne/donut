var delegate_error = require('./error');
var activityRecorder = require('../activity-recorder');
var User = require('../models/user');

module.exports = {

  success: function(data, accept) {
    // could add ACL check here if needed
    accept(null, true);
    activityRecorder('authorization:success', '', data);
  },

  fail: function(data, message, error, accept) {
    if(error) {
      throw new Error(message);
    }

    // Test environment only! (allow virtual client connexion opening)
    if (process.env.NODE_ENV == 'dev' || process.env.NODE_ENV == 'test') {
      console.log([data, message, error, accept]);
      User.findById(data.query.virtualuserid, function(err, virtualUser) {
        if (err) throw new Error('Error while retrieving virtual user: '+err);
        if (!virtualUser) throw new Error('No corresponding virtual user found');
        data['user'] = virtualUser;
        data['logged_in'] = true;
        accept(null, true);
      });
      return;
    }
    // End - Test environment only!

    accept(null, false);

    activityRecorder('authorization:fail', '', {
      data: data,
      message: message,
      error: error
    });
  }

};