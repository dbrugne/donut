var $ = require('jquery');
var debug = require('./donut-debug')('donut:app');

var AppFactory = require('@dbrugne/donut-client');

// token retrieving logic
var wsToken = null;
var getTokenFromSession = function (callback) {
  $.ajax({
    url: '/oauth/get-token-from-session',
    type: 'GET',
    dataType: 'json',
    success: function (json) {
      if (json.err) {
        return callback(json.err);
      }
      wsToken = json.token;
      return callback(null, wsToken);
    },
    error: function (xhr, status, errorThrown) {
      return callback(errorThrown);
    }
  });
};

module.exports = AppFactory({
  device: 'browser',
  host: '//' + window.location.hostname,
  debug: debug,
  retrieveToken: function (callback) {
    if (wsToken) {
      return callback(null, wsToken);
    }

    return getTokenFromSession(callback);
  },
  invalidToken: function (callback) {
    return getTokenFromSession(callback);
  }
});
