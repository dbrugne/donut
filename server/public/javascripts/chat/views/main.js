define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/window',
  'views/status',
  'views/discussions',
  'views/onlines',
  'views/room-create',
  'views/room-search',
  'views/user-search',
  'views/user-profile'
], function ($, _, Backbone, client, windowView, statusView, discussionsView, onlinesView, roomCreateView, roomSearchView, userSearchView, userProfileView) {
  var MainView = Backbone.View.extend({

    el: $("#chat"),

    events: {
      'click #search-room-link': 'searchRoomModal',
      'click #create-room-link': 'createRoomModal',
      'click #search-user-link': 'searchUserLink'
    },

    initialize: function() {
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

    userProfileModal: function(user_id) {
      userProfileView.show(user_id);
    }

    // @todo : open user profile, open room profile, one to one with this user
    //        should be bound in this class only!!

  });

  return new MainView();
});