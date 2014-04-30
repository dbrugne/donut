var delegate_error = require('./error');

module.exports = {

  success: function(data, accept) {
    // could add ACL check here if needed
    accept(null, true);
    // @todo : activity
  },

  fail: function(data, message, error, accept) {
    if(error) {
      throw new Error(message);
    }

    delegate_error('Unable to log this socket: '+message+' ('+error+')')

    accept(null, false);
    // @todo : activity
  }

};