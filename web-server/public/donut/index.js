require.config({
  paths: {
    '_templates'                  : './templates',
    'jquery'                      : '../vendor/jquery/jquery',
    'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
    'text'                        : '../vendor/requirejs-text/text',
    'socket.io'                   : '/socket.io',
    'pomelo'                      : './libs/pomelo',
    'underscore'                  : '../vendor/underscore-amd/underscore',
    'backbone'                    : '../vendor/backbone-amd/backbone',
    'i18next'                     : '../vendor/i18next/i18next.amd.withJQuery',
    'moment'                      : '../vendor/moment/moment',
    'moment-fr'                   : '../vendor/moment/lang/fr',
    'facebook'                    : '//connect.facebook.net/fr_FR/all',
    'jquery.ui.widget'            : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
    'jquery.iframe-transport'     : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
    'jquery.fileupload'           : '../vendor/blueimp-file-upload/js/jquery.fileupload',
    'jquery.cloudinary'           : '../vendor/cloudinary_js/js/jquery.cloudinary',
    'cloudinary.widget'           : '//widget.cloudinary.com/global/all',
    'jquery.cloudinary-donut'     : '/cloudinary',
    'jquery.insertatcaret'        : '../javascripts/plugins/jquery.insertatcaret',
    'jquery.maxlength'            : '../javascripts/plugins/jquery.maxlength',
    'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
    'jquery.smilify'              : '../javascripts/plugins/jquery.smilify',
    'jquery.momentify'            : '../javascripts/plugins/jquery.momentify',
    'jquery.colorify'             : '../javascripts/plugins/jquery.colorify',
    'jquery.mentionsinput'        : '../javascripts/plugins/jquery.mentionsInput',
    'underscore.template-helpers' : '../javascripts/plugins/underscore.template-helpers',
    'html.sortable'               : '../vendor/html.sortable/dist/html.sortable'
  },
  shim: {
    'bootstrap'                   : ['jquery'],
    'jquery.cloudinary'           : ['jquery'],
    'jquery.cloudinary-donut'     : ['jquery'],
    'jquery.insertatcaret'        : ['jquery'],
    'jquery.maxlength'            : ['jquery'],
    'jquery.linkify'              : ['jquery'],
    'jquery.smilify'              : ['jquery'],
    'jquery.momentify'            : ['jquery'],
    'jquery.colorify'             : ['jquery'],
    'jquery.mentionsinput'        : ['jquery'],
    'cloudinary.widget'           : ['jquery'],
    'html.sortable'               : ['jquery'],
    'underscore.template-helpers' : ['underscore'],
    'facebook' : {
      exports: 'FB'
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
  'jquery.mentionsinput',
  'bootstrap',
  'moment-fr',
  'underscore.template-helpers',
  'html.sortable'
], function (app, $, _, Backbone, i18next, facebook, moment) {

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
  _.addTemplateHelpers({t: i18next.t});

  // Cloudinary setup
  $.cloudinary.config({
    cloud_name: window.cloudinary_cloud_name,
    api_key: window.cloudinary_api_key
  });
  window.cloudinary.setCloudName(window.cloudinary_cloud_name); // @todo : ouille!

  // Moment language
  window.moment = moment;
  var momentFormat = (i18next.lng() == 'fr')
    ? {
    relativeTime : {
      future : "%s",
      past : "%s",
      s : "à l'instant",
      m : "1mn",
      mm : "%dmin",
      h : "1h",
      hh : "%dh",
      d : "hier",
      dd : "%d jours",
      M : "un mois",
      MM : "%d mois",
      y : "un an",
      yy : "%d ans"
    }
  }
    : {
    relativeTime : {
      future : "%s",
      past : "%s",
      s : "just now",
      m : "1mn",
      mm : "%dmin",
      h : "1h",
      hh : "%dh",
      d : "yesterday",
      dd : "%d days",
      M : "one month",
      MM : "%d months",
      y : "one year",
      yy : "%d years"
    }
  };
  moment.lang(i18next.lng(), momentFormat);

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

  // run
  app.initialize();

});