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
      'hidden.bs.modal': 'teardown',
      'click .join': 'hide' // hide modal when user click on onetoone button
    },

    initialize: function() {
      this.listenTo(client, 'room:profile', this.onProfile)
    },

    onProfile: function(data) {
      this.render(data.room).show();
    },

    render: function(room) {
      var html = this.template({room: room});
      var $body = this.$el.find('.modal-body').first();
      $body.html(html);
      $body.find('.website').linkify();
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