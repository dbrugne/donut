define([
  'underscore',
  'backbone',
  'router',
  'models/client',
  'views/main'
], function (_, Backbone, router, client, mainView) {
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

    initialize: function() {
      // Everything was already loaded by require.js,
      // it just left to establish connection:
      client.connect();
    }
  };

  return App;
});