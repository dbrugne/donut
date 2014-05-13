define([
  'underscore',
  'backbone',
  'collections/discussions',
  'models/client',
  'models/current-user',
  'views/main'
], function (_, Backbone, discussions, client, currentUser, mainView) {
  var ChatRouter = Backbone.Router.extend({

    routes: {
      '':                 'root',
      'room/:name':       'focusRoom',
      'user/:user':       'focusOneToOne',
      '*default':         'default'
    },

    initialize: function () {
      // Server connection is established
      this.listenTo(client, 'connect', this.onServerConnect);

      // Get hello from server
      this.listenTo(client, 'welcome', this.onServerWelcome);

      // Everything is in place/bound, connection!
      client.connect();
    },

    onServerConnect: function(data) {
    },

    onServerWelcome: function(data) {
      // Update current user data
      _.each(Object.keys(data), function(propertyKey) {
        currentUser.set(propertyKey, data[propertyKey]);
      });

      console.log('Hello '+currentUser.get('username')+'!');

      // Join current user rooms
      _.each(data.rooms, function(room) {
        client.join(room);
      });

      if (!window.historyStarted) {
        // @todo : bug, when arriving on http://FQDN/!#room/toulouse with #toulouse already opened in user entity
        // => provoke a double room:join and a double room:welcome and broke routing
        Backbone.history.start();
        window.historyStarted = true;
      }
    },

    root: function() {
      console.log('router: home');
      discussions.focus();
      // @todo : replace by default homepage
    },

    focusRoom: function(name) {
      console.log('router: focusRoom '+name);
      discussions.focusRoomByName('#'+name);
    },

    focusOneToOne: function(username) {
      console.log('router: focusOneToOne ' + username);
      discussions.focusOneToOneByUsername(username);
    },

    default: function() {
      console.log('router: default');
      // @todo : handle 404 type behavior in DOM
    }
  });

  var initialize = function () {
    var router = new ChatRouter();
  };

  return {
    initialize: initialize
  };

});