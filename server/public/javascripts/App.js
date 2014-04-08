$(function() {

    Chat = window.Chat || { };

    Chat.App = {

      init: function() {
          // Server
          Chat.server = new Chat.ServerModel( {debugOn: false} );

          // Discussions
          Chat.discussions = new Chat.DiscussionsCollection();

          // Interface
          Chat.main = new Chat.MainView();

          // Router
          Chat.router = new Chat.Routes();

          // Server (connection)
          Chat.server.connect();

          // Run router
          Backbone.history.start();
      }

    };

});

$(document).ready(function() {

    window.Chat.App.init();

});