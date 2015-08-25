var $ = require('jquery')
var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

// @todo : mount mainview, $, _ on windows only on debug mode
window.$ = window.jQuery = $;
window._ = _;

// jQuery plugins
require('./web-plugins');

var i18next = require('i18next-client');
var moment = require('moment');
var app = require('./app');

var desktopNotify = require('html5-desktop-notifications');

// i18n setup
var i18nextOptions = {
  cookieName: 'donut.lng',
  debug: false // @debug
};
// @doc: http://i18next.com/pages/doc_init.html#getresources
// @todo : try to load JSON on build
if (false)
  i18nextOptions = _.extend({
    resGetPath: '/locales/resources.json?lng=__lng__&ns=__ns__',
    dynamicLoad: true
  }, i18nextOptions);
else
  i18nextOptions.resStore = require('../build/translations');
i18next.init(i18nextOptions);

// Moment language
window.moment = moment;
var momentFormat = (i18next.lng() == 'fr')
  ? {
  relativeTime: {
    future: "%s",
    past: "%s",
    s: "à l'instant",
    m: "1mn",
    mm: "%dmin",
    h: "1h",
    hh: "%dh",
    d: "hier",
    dd: "%d jours",
    M: "un mois",
    MM: "%d mois",
    y: "un an",
    yy: "%d ans"
  }
}
  : {
  relativeTime: {
    future: "%s",
    past: "%s",
    s: "just now",
    m: "1mn",
    mm: "%dmin",
    h: "1h",
    hh: "%dh",
    d: "yesterday",
    dd: "%d days",
    M: "one month",
    MM: "%d months",
    y: "one year",
    yy: "%d years"
  }
};
moment.locale(i18next.lng(), momentFormat);

// Contact form
$('[data-toggle="contactform"]').contactform({});

//// Desktop notifications configuration
//desktopNotify.config({
//  pageVisibility: true, // Always display, even if application is in background
//  autoClose: 3000
//});

// make i18next available from all underscore templates views (<%= t('key') %>)window.t = i18next.t; // @global
$.t = global.t = i18next.t; // @global
window.$ = window.jQuery = $;


// run
app.initialize();
