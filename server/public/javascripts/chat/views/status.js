define([
  'jquery',
  'underscore',
  'backbone',
  'models/client'
], function ($, _, Backbone, client) {
  var StatusView = Backbone.View.extend({

    el: $('#btn-status'),

    initialize: function() {
      var that = this;
      this.listenTo(this.model, 'online', function() { that.update('online'); });
      this.listenTo(this.model, 'connecting', function() { that.update('connecting'); });
      this.listenTo(this.model, 'offline', function() { that.update('offline'); });
      this.listenTo(this.model, 'error', function() { that.update('error'); });
    },
    update: function(status) {
      this.$el.css('color', 'red');
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

  return StatusView;
});
