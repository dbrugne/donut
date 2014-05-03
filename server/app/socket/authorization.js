var delegate_error = require('./error');
var activityRecorder = require('../activity-recorder');

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

    accept(null, false);

    activityRecorder('authorization:fail', '', {
      data: data,
      message: message,
      error: error
    });
  }

};