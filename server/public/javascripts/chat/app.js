define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'moment',
  'routeur',
  'models/client',
  'views/main',
  // jQuery plugins, load and attach to $ once
  'jquery.insertatcaret',
  'jquery.cloudinary',
  'jquery.linkify',
  'jquery.smilify',
  'jquery.momentify',
  'jquery.colorify',
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
   *   - Render the online users block
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
      moment.lang('fr');

      // Everything was already loaded by require.js,
      // it just left to establish connection:
      client.connect();
    }
  };

  return App;
});