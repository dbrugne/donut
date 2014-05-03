define([
  'underscore',
  'backbone',
  'collections/discussions',
  'models/client',
  'models/current-user',
  'views/main'
], function (_, Backbone, discussions, client, currentUser, mainView) {

    // @todo : now window reopen not pertubate routing:
    // - should change room focus/open and onetoone focus open to use router only
    // - should auto join room/onetoone on arriving on page
    // - should auto focus first room if no is focused

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
      if (!window.historyStarted) {
        Backbone.history.start();
        window.historyStarted = true;
      }
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