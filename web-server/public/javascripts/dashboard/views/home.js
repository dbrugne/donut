define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/home.html'
], function ($, _, Backbone, htmlTemplate) {

  var HomeView = Backbone.View.extend({

    id: 'home',

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

  return HomeView;
});