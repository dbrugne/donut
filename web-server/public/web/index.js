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
require('bootstrap/js/button');
require('bootstrap/js/popover');
require('bootstrap/js/collapse');

// contact form
$('[data-toggle="contactform"]').contactform({});

// run
require('./libs/router');
var mainView = require('./views/main');
mainView.run();
