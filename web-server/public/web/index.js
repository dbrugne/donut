// jQuery
var $ = require('jquery');
global.jQuery = $; // expose jQuery globally, needed for some beside plugins
require('../vendor/html.sortable/dist/html.sortable.min');
require('../javascripts/plugins/jquery.insertatcaret');
require('../javascripts/plugins/jquery.maxlength');
require('../javascripts/plugins/jquery.smilify');
require('../javascripts/plugins/jquery.socialify');
require('../javascripts/plugins/jquery.contactform');
require('bootstrap/js/transition');
require('bootstrap/js/dropdown');
require('bootstrap/js/modal');
require('bootstrap/js/tooltip');
require('bootstrap/js/popover');

// contact form
$('[data-toggle="contactform"]').contactform({});

// run
require('./libs/router');
var mainView = require('./views/main');
mainView.run();
