// jQuery
var $ = require('jquery');
global.jQuery = $; // expose jQuery globally, needed for some beside plugins
require('../javascripts/jquery.insertatcaret');
require('../javascripts/jquery.maxlength');
require('../javascripts/jquery.smilify');
require('../javascripts/jquery.socialify');
require('../javascripts/jquery.contactform');
require('bootstrap/js/transition');
require('bootstrap/js/dropdown');
require('bootstrap/js/modal');
require('bootstrap/js/tooltip');
require('bootstrap/js/popover');
require('bootstrap/js/collapse');

// contact form
$('[data-toggle="contactform"]').contactform({});

// client
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
var client = require('./libs/client');
client.setup({
  device: 'browser',
  host: '//' + window.location.hostname,
  retrieveToken: getTokenFromSession,
  invalidToken: getTokenFromSession
});

// run
require('./libs/router');
var mainView = require('./views/main');
mainView.run();
