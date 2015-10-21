var $ = require('jquery');
var debug = require('./donut-debug')('donut:client');
var Client = require('@dbrugne/donut-common/client');

// token retrieving logic
var getTokenFromSession = function (callback) {
  $.ajax({
    url: '/oauth/get-token-from-session',
    type: 'GET',
    dataType: 'json',
    success: function (json) {
      if (json.err) {
        return callback(json.err);
      }
      return callback(null, json.token);
    },
    error: function (xhr, status, errorThrown) {
      return callback(errorThrown);
    }
  });
};

module.exports = Client({
  device: 'browser',
  host: '//' + window.location.hostname,
  debug: debug,
  retrieveToken: getTokenFromSession,
  invalidToken: getTokenFromSession
});
