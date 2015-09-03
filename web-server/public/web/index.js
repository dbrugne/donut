var $ = require('jquery');
global.jQuery = $;

require('../vendor/html5-desktop-notifications/desktop-notify-min');
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

var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

var i18next = require('i18next-client');
var moment = require('moment');
require('moment/locale/fr');
var app = require('./app');

// i18n setup
var i18nextOptions = {
  cookieName: 'donut.lng',
  debug: false // @debug
};
// @doc: http://i18next.com/pages/doc_init.html#getresources
if (false) {
  i18nextOptions = _.extend({
    resGetPath: '/locales/resources.json?lng=__lng__&ns=__ns__',
    dynamicLoad: true
  }, i18nextOptions);
} else {
  i18nextOptions.resStore = require('./locales');
}
i18next.init(i18nextOptions);

// Moment language
window.moment = moment;
var momentFormat = (i18next.lng() === 'fr') ?
  {
    relativeTime: {
      future: '%s',
      past: '%s',
      s: 'à l\'instant',
      m: '1mn',
      mm: '%dmin',
      h: '1h',
      hh: '%dh',
      d: 'hier',
      dd: '%d jours',
      M: 'un mois',
      MM: '%d mois',
      y: 'un an',
      yy: '%d ans'
    }
  } :
  {
    relativeTime: {
      future: '%s',
      past: '%s',
      s: 'just now',
      m: '1mn',
      mm: '%dmin',
      h: '1h',
      hh: '%dh',
      d: 'yesterday',
      dd: '%d days',
      M: 'one month',
      MM: '%d months',
      y: 'one year',
      yy: '%d years'
    }
  };
moment.locale(i18next.lng(), momentFormat);

// Contact form
$('[data-toggle="contactform"]').contactform({});

// Desktop notifications configuration
window.notify.config({
  pageVisibility: true, // Always display, even if application is in background
  autoClose: 3000
});

// make i18next available from all underscore templates views (<%= t('key') %>)window.t = i18next.t; // @global
$.t = global.t = i18next.t; // @global
window.$ = window.jQuery = $;
// @todo : mount mainview, $, _ on windows only on debug mode

// run
app.initialize();
