define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'collections/discussions',
  'text!templates/room-search-results.html',
  'bootstrap'
], function ($, _, Backbone, client, discussions, resultsTemplate) {
  var RoomSearchView = Backbone.View.extend({

    el: $('#room-search-modal'),

    template: _.template(resultsTemplate),

    events: {
      'click .room-search-submit': 'search',
      'keyup .room-search-input': 'search',
      'click .rooms-list li': 'openSelected'
    },

    initialize: function() {
      this.listenTo(client, 'room:searchsuccess', this.onSuccess);
      this.listenTo(client, 'room:searcherror', this.onError);
    },

    show: function() {
      this.$el.modal('show');
    },

    hide: function() {
      this.$el.modal('hide');
    },

    render: function(rooms) {
      var html = this.template({
        rooms: rooms
      });
      this.$el.find('.rooms-list').first().html(html);

      return this;
    },

    search: function() {
      var search = this.$el.find('.room-search-input').first().val();
      client.roomSearch(search);
    },

    onSuccess: function(data) {
      this.render(data.rooms);
    },

    onError: function() {
      // @todo : implement error-callback in DOM
      console.error('Error on searchForRooms call');
    },

    openSelected: function(event) {
      var name = $(event.currentTarget).data('name');

      // Is already opened?
      var room = discussions.get(name);
      if (room != undefined) {
        discussions.focus(room);
      } else {
        // Room not already open
        discussions.thisDiscussionShouldBeFocusedOnSuccess = name;
        client.join(name);
      }

      this.hide();
    }

  });

  return new RoomSearchView();
});