define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/realtime.html'
], function ($, _, Backbone, htmlTemplate) {

  var RealtimeView = Backbone.View.extend({

    id: 'realtime',

    template: _.template(htmlTemplate),

    initialize: function() {
      this.render();
    },
    render: function() {
      var html = this.template({});
      this.$el.html(html);
      return this;
    }
  });

  return RealtimeView;
});