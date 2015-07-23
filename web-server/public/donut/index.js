require.config({
  paths: {
    '_templates': ['../build/templates', './templates'],
    'debug': '../vendor/visionmedia-debug/dist/debug',
    'jquery': '../vendor/jquery/dist/jquery',
    'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
    'text': '../vendor/requirejs-text/text',
    'socket.io': '/socket.io',
    'pomelo': './libs/pomelo',
    'underscore': '../vendor/underscore-amd/underscore',
    'backbone': '../vendor/backbone-amd/backbone',
    'i18next': '../vendor/i18next/i18next.amd.withJQuery',
    'moment': '../vendor/moment/moment',
    'moment-fr': '../vendor/moment/lang/fr',
    'facebook': '//connect.facebook.net/fr_FR/all',
    'desktop-notify': '../vendor/html5-desktop-notifications/desktop-notify',
    'jquery.ui.widget': '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
    'jquery.iframe-transport': '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
    'jquery.fileupload': '../vendor/blueimp-file-upload/js/jquery.fileupload',
    'jquery.cloudinary': '../vendor/cloudinary_js/js/jquery.cloudinary',
    'cloudinary.widget': '//widget.cloudinary.com/global/all',
    'jquery.cloudinary-donut': '/cloudinary',
    'jquery.insertatcaret': '../javascripts/plugins/jquery.insertatcaret',
    'jquery.maxlength': '../javascripts/plugins/jquery.maxlength',
    'jquery.linkify': '../javascripts/plugins/jquery.linkify',
    'jquery.smilify': '../javascripts/plugins/jquery.smilify',
    'jquery.momentify': '../javascripts/plugins/jquery.momentify',
    'jquery.colorify': '../javascripts/plugins/jquery.colorify',
    'jquery.socialify': '../javascripts/plugins/jquery.socialify',
    'jquery.mentionsinput': '../javascripts/plugins/jquery.mentionsInput',
    'jquery.contactform': '../javascripts/plugins/jquery.contactform',
    'html.sortable': '../vendor/html.sortable/dist/html.sortable'
  },
  shim: {
    'bootstrap': ['jquery'],
    'jquery.cloudinary': ['jquery'],
    'jquery.cloudinary-donut': ['jquery'],
    'jquery.insertatcaret': ['jquery'],
    'jquery.maxlength': ['jquery'],
    'jquery.linkify': ['jquery'],
    'jquery.smilify': ['jquery'],
    'jquery.momentify': ['jquery'],
    'jquery.colorify': ['jquery'],
    'jquery.socialify': ['jquery'],
    'jquery.mentionsinput': ['jquery'],
    'jquery.contactform': ['jquery'],
    'cloudinary.widget': ['jquery'],
    'html.sortable': ['jquery'],
    'facebook': {
      exports: 'FB'
    },
    'desktop-notify': {
      exports: 'notify'
    }
  }
});

require([
  'app',
/************************************
 * Load librairies
 ************************************/
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'facebook',
  'moment',
  'desktop-notify',
  'socket.io',
/************************************
 * Load (once) and attach plugins to jQuery and underscore
 ************************************/
  'jquery.insertatcaret',
  'jquery.maxlength',
  'jquery.cloudinary',
  'jquery.cloudinary-donut',
  'cloudinary.widget',
  'jquery.linkify',
  'jquery.smilify',
  'jquery.momentify',
  'jquery.colorify',
  'jquery.socialify',
  'jquery.mentionsinput',
  'jquery.contactform',
  'bootstrap',
  'moment-fr',
  'html.sortable'
], function (app, $, _, Backbone, i18next, facebook, moment, desktopNotify) {

  // i18n setup
  window.i18next = i18next;
  i18next.init({
    resGetPath: '/locales/resources.json?lng=__lng__&ns=__ns__',
    dynamicLoad: true,
    saveMissing: true,
    cookieName: 'donut.lng',
    debug: false // @debug
  });
  // make i18next available from all underscore templates views (<%= t('key') %>)
  window.t = i18next.t; // @global

  // Cloudinary setup
  $.cloudinary.config({
    cloud_name: window.cloudinary_cloud_name,
    api_key: window.cloudinary_api_key
  });
  window.cloudinary.setCloudName(window.cloudinary_cloud_name); // @global

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
  moment.lang(i18next.lng(), momentFormat);

  // Contact form
  $('[data-toggle="contactform"]').contactform({});

  // Facebook setup
  try {
    facebook.init({
      appId: window.facebook_app_id,
      version: 'v2.1',
      status: true,
      xfbml: false
    });
  } catch (e) {
    console.log(e);
    return false;
  }

  // Desktop notifications configuration
  desktopNotify.config({
    pageVisibility: true, // Always display, even if application is in background
    autoClose: 3000
  });

  // run
  app.initialize();

});