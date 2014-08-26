define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'moment',
  'routeur',
  'models/client',
  'views/main',
//  'facebook',
  // jQuery plugins, load and attach to $ once
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
  'moment-fr'
], function ($, _, Backbone, i18next, moment, router, client, mainView) {
  /**
   * The init process is the following:
   * - Load router - done by require.js
   * - Load client - done by require.js
   * - Load main view and subviews - done by require.js
   *   - Models and views bound client's events
   *
   * <now everything is ready to begin chat>
   *
   * - Connect client
   *   - Trigger router run
   *
   * - Receive welcome (in mainView)
   *   - Store current user
   *   - Render the home panel
   *   - Join 'general' room (no focus)
   *   - Join rooms received in welcome (no focus)
   *
   * - Join the URI-requested room if needed (and focus)
   *
   * In case of deconnection:
   * - <disconnect>
   * - Stop router
   * - <reconnect>
   * - Start router
   * - Receive welcome (in mainView)
   * ...
   */
  var App = {

    // The main part of the job is done by require.js loader
    initialize: function() {
      // Give some object to global scope to allow other context to use it
      window.router = router;
      window.main =   mainView;
      window.moment = moment;

      // i18n setup
      i18next.init({
        lng: 'fr-FR',
        fallbackLng: ['fr-FR', 'en-EN'],
        resGetPath: '/locales/resources.json?lng=__lng__&ns=__ns__',
        dynamicLoad: true,
        saveMissing: true,
        debug: false // @debug
      });

      // Cloudinary setup
      $.cloudinary.config({
        cloud_name: window.cloudinary_cloud_name,
        api_key: window.cloudinary_api_key
      });

      // Moment language
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

      // Everything was already loaded by require.js,
      // it just left to establish connection:
      client.connect();
    }
  };

  return App;
});