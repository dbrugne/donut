var $ = require('jquery');
global.jQuery = $; // expose jQuery globally, needed for some beside plugins
require('../vendor/html5-desktop-notifications/desktop-notify');
require('../vendor/html.sortable/dist/html.sortable.min');
require('../javascripts/plugins/jquery.insertatcaret');
require('../javascripts/plugins/jquery.maxlength');
require('../javascripts/plugins/jquery.smilify');
require('../javascripts/plugins/jquery.momentify');
require('../javascripts/plugins/jquery.socialify');
require('../javascripts/plugins/jquery.contactform');
require('bootstrap/js/transition');
require('bootstrap/js/dropdown');
require('bootstrap/js/modal');
require('bootstrap/js/tooltip');
require('bootstrap/js/popover');

var app = require('./app');

// i18next
var i18next = require('i18next-client');
var locales = require('../../../locales/fr/translation.json'); // @todo : en/fr
i18next.init({
  cookieName: 'donut.lng',
  resStore: locales,
  debug: false // @debug
});

// moment
var moment = require('moment');
require('moment/locale/fr');
moment.locale(i18next.lng(), locales[i18next.lng()]['translation']['moment']);

// contact form
$('[data-toggle="contactform"]').contactform({});

// notify
window.notify.config({
  pageVisibility: true, // always display, even if application is in background
  autoClose: 3000
});

// run
app.initialize();
