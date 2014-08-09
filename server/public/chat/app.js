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
  'jquery.maxlength',
  'jquery.cloudinary',
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
      $.c = {
        roomAvatar: function(identifier, transformation) {
          return this._url(identifier, transformation, 'default/room-avatar-default');
        },
        roomPoster: function(identifier, transformation) {
          return this._url(identifier, transformation, 'default/room-poster-default');
        },
        userAvatar: function(identifier, transformation) {
          return this._url(identifier, transformation, 'default/user-avatar-default');
        },
        userPoster: function(identifier, transformation) {
          return this._url(identifier, transformation, 'default/user-poster-default');
        },
        _url: function(identifier, transformation, defaultIdentifier) {
          var options = {};
          if (transformation)
            var options = {transformation: transformation};

          if (!identifier)
            identifier = defaultIdentifier || 'default/default';

          return $.cloudinary.url(identifier, options);
        }
      };

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

      // Everything was already loaded by require.js,
      // it just left to establish connection:
      client.connect();
    }
  };

  return App;
});