define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'collections/discussions',
  'views/window',
  'views/status',
  'views/discussions',
  'views/onlines',
  'views/room-create',
  'views/room-search',
  'views/user-search',
  'views/user-profile', // need to be loaded here to instantiate DOM
  'views/room-profile', // idem
  'jquery.cloudinary'
], function ($, _, Backbone, client, discussions, windowView, statusView, discussionsView, onlinesView, roomCreateView, roomSearchView, userSearchView, userProfile, roomProfile) {
  var MainView = Backbone.View.extend({

    el: $("#chat"),

    events: {
      'click #search-room-link': 'searchRoomModal',
      'click #create-room-link': 'createRoomModal',
      'click #search-user-link': 'searchUserLink',
      'click .open-user-profile': 'openUserProfile',
      'dblclick .dbl-open-user-profile': 'openUserProfile',
      'click .open-onetoone': 'openUserOneToOne'
    },

    initialize: function() {
      $.cloudinary.config({
        cloud_name: 'roomly', // @todo : get from configuration file
        api_key:    '962274636195222' // @todo : get from configuration file
      });
    },

    searchRoomModal: function() {
      roomSearchView.search();
      roomSearchView.show();
    },

    createRoomModal: function() {
      roomCreateView.show();
    },

    searchUserLink: function() {
      userSearchView.search();
      userSearchView.show();
    },

    openUserProfile: function(event) {
      this._handleAction(event);
      var userId = $(event.currentTarget).data('userId');
      if (userId) {
        client.userProfile(userId);
      }
      return false; // stop propagation
    },

    openUserOneToOne: function(event) {
      this._handleAction(event);
      var userId = $(event.currentTarget).data('userId');
      if (userId) {
        client.open(userId);
      }

      return false; // stop propagation
    },

    _handleAction: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $('.modal').modal('hide');
    }

  });

  return new MainView();
});