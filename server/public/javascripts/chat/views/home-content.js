define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/home-onlines',
  'text!templates/home-content.html'
], function ($, _, Backbone, client, homeOnlinesView, homeTemplate) {
  var HomeView = Backbone.View.extend({

    el: $('#content'),

    template: _.template(homeTemplate),

    initialize: function() {
      this.listenTo(client, 'home', this.render);
    },
    render: function(data) {
      var html = this.template(data);
      this.$el.html(html);
      return this;
    }

  });

  return new HomeView();
});
