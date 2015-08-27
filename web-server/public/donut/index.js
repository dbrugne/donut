require.config({
  paths: {
    '_templates': ['../build/templates', './templates'],
    '_translations': ['../build/translations', './translations'],
    'debug': '../vendor/visionmedia-debug/dist/debug',
    'jquery': '../vendor/jquery/dist/jquery',
    'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
    'text': '../vendor/requirejs-text/text',
    'socket.io': '/socket.io',
    'underscore': '../vendor/underscore/underscore',
    'backbone': '../vendor/backbone/backbone',
    'i18next': '../vendor/i18next/i18next.amd.withJQuery',
    'moment': '../vendor/moment/moment',
    'moment-fr': '../vendor/moment/locale/fr',
    'desktop-notify': '../vendor/html5-desktop-notifications/desktop-notify',
    'jquery.insertatcaret': '../javascripts/plugins/jquery.insertatcaret',
    'jquery.maxlength': '../javascripts/plugins/jquery.maxlength',
    'jquery.smilify': '../javascripts/plugins/jquery.smilify',
    'jquery.momentify': '../javascripts/plugins/jquery.momentify',
    'jquery.colorify': '../javascripts/plugins/jquery.colorify',
    'jquery.socialify': '../javascripts/plugins/jquery.socialify',
    'jquery.contactform': '../javascripts/plugins/jquery.contactform',
    'html.sortable': '../vendor/html.sortable/dist/html.sortable',
    'common': '../vendor/donut-common/index'
  },
  shim: {
    'bootstrap': ['jquery'],
    'jquery.insertatcaret': ['jquery'],
    'jquery.maxlength': ['jquery'],
    'jquery.smilify': ['jquery'],
    'jquery.momentify': ['jquery'],
    'jquery.colorify': ['jquery'],
    'jquery.socialify': ['jquery'],
    'jquery.contactform': ['jquery'],
    'html.sortable': ['jquery'],
    'desktop-notify': {
      exports: 'notify'
    }
  }
});

require([
  'app',
  '_translations',
  'jquery',
  'underscore',
  'backbone',
  'common',
  'i18next',
  'moment',
  'desktop-notify',
/************************************
 * Load (once) and attach plugins to jQuery and underscore
 ************************************/
  'jquery.insertatcaret',
  'jquery.maxlength',
  'jquery.smilify',
  'jquery.momentify',
  'jquery.colorify',
  'jquery.socialify',
  'jquery.contactform',
  'bootstrap',
  'moment-fr',
  'html.sortable'
], function (app, translations, $, _, Backbone, common, i18next, moment, desktopNotify) {
  // i18next setup
  window.i18next = i18next; // @debug
  var i18nextOptions = {
    cookieName: 'donut.lng',
    debug: false // @debug
  };
  // @doc: http://i18next.com/pages/doc_init.html#getresources
  if (_.isString(translations))
    i18nextOptions = _.extend({
      resGetPath: translations,
      dynamicLoad: true
    }, i18nextOptions);
  else
    i18nextOptions.resStore = translations;
  i18next.init(i18nextOptions);
  // make i18next available from all underscore templates views (<%= t('key') %>)
  window.t = i18next.t; // @global

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

  // Desktop notifications configuration
  desktopNotify.config({
    pageVisibility: true, // Always display, even if application is in background
    autoClose: 3000
  });

  // run
  app.initialize();

});