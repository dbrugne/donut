define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/room-profile.html'
], function ($, _, Backbone, client, profileTemplate) {
  var RoomProfileView = Backbone.View.extend({

    el: $('#room-profile-modal'),

    template: _.template(profileTemplate),

    events: {
      'hidden.bs.modal': 'teardown'
    },

    initialize: function() {
      this.listenTo(client, 'room:profile', this.onProfile)
    },

    onProfile: function(data) {
      this.render(data.room).show();
    },

    render: function(room) {
      var html = this.template({room: room});
      this.$el.find('.modal-body').first().html(html);
      return this;
    },

    show: function() {
      this.$el.modal('show');
    },

    hide: function() {
      this.$el.modal('hide');
    },

    teardown: function() {
      this.$el.data('modal', null);
    }

  });

  return new RoomProfileView();
});