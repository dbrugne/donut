define([
  'jquery',
  'underscore',
  'backbone',
  'models/client'
], function ($, _, Backbone, client) {
  var StatusView = Backbone.View.extend({

    el: $('#button-status'),

    initialize: function() {
      var that = this;

      this.listenTo(this.model, 'connecting', function() {
        that.update('connecting');
      });

      this.listenTo(this.model, 'connect', function() {
        that.update('online');
      });

      this.listenTo(this.model, 'reconnecting', function() {
        that.update('connecting');
      });

      this.listenTo(this.model, 'reconnect', function() {
        that.update('online');
      });

      this.listenTo(this.model, 'disconnect', function() {
        that.update('offline');
      });

      this.listenTo(this.model, 'connect_failed', function() {
        that.update('error');
      });

      this.listenTo(this.model, 'reconnect_failed', function() {
        that.update('error');
      });
    },

    update: function(status) {
      switch (status) {
        case 'online':
          this.$el.removeClass().addClass('online').html('Online');
          break;
        case 'connecting':
          this.$el.removeClass().addClass('connecting').html('Connecting');
          break;
        case 'offline':
          this.$el.removeClass().addClass('offline').html('Offline');
          break;
        case 'error':
          this.$el.removeClass().addClass('error').html('Error');
          break;
      }
    }

  });

  return new StatusView({model: client});
});
