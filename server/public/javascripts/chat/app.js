define([
  'jquery',
  'underscore',
  'backbone',
  'routeur',
  'models/client',
  'views/main',
  // jQuery plugins, load and attach to $ once
  'jquery.insertatcaret',
  'jquery.dateformat',
  'jquery.cloudinary',
  'jquery.linkify',
  'bootstrap'
], function ($, _, Backbone, router, client, mainView) {
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
      // Give the router a global scope (some views need to router.navigate())
      window.router = router;

      // Prepare things
      $.cloudinary.config({
        cloud_name: window.cloudinary_cloud_name,
        api_key: window.cloudinary_api_key
      });

      // Everything was already loaded by require.js,
      // it just left to establish connection:
      client.connect();
    }
  };

  return App;
});