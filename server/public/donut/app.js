define([
  /************************************
   * Load dependencies and plugins
   ************************************/
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'moment',
  // Load (once) and attach plugins to jQuery and underscore
  'jquery.insertatcaret',
  'jquery.maxlength',
  'jquery.cloudinary',
  'jquery.cloudinary-donut',
  'jquery.linkify',
  'jquery.smilify',
  'jquery.momentify',
  'jquery.colorify',
  'jquery.scroller',
  'bootstrap',
  'moment-fr',
  'underscore.template-helpers'
], function ($, _, Backbone, i18next, moment) {
  var App = {

    // The main part of the job is done by require.js loader
    initialize: function() {
      // i18n setup
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

      // Moment language
      window.moment = moment;
      moment.lang('fr', {
        relativeTime : {
          future : "dans %s",
          past : "%s",
          s : "à l'instant",
          m : "1mn",
          mm : "%dmin",
          h : "1h",
          hh : "%dh",
          d : "un jour",
          dd : "%d jours",
          M : "un mois",
          MM : "%d mois",
          y : "un an",
          yy : "%d ans"
        }
      });

//      // Facebook setup
//      try {
//        facebook.init({
//          appId: window.facebook_app_id,
//          version: 'v2.1',
//          status: true,
//          xfbml: true
//        });
//      } catch (e) {
//        console.log(e);
//        return false;
//      }

      // Every dependencies was loaded on this file load by require.js
      // Now we launch the app by loading principal elements
      require(['routeur','models/client', 'views/main'], function(router, client, mainView) {
        // Give some object to global scope to allow other context to use it
        // @debug
        window.router = router;
        window.client = client;
        window.main   =   mainView;
        client.connect();
      });
    }
  };

  return App;
});