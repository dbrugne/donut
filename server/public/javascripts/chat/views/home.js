define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/home.html'
], function ($, _, Backbone, client, homeTemplate) {
  var HomeView = Backbone.View.extend({

    el: $('#home-content'),

    template: _.template(homeTemplate),

    initialize: function() {
      this.listenTo(client, 'home', this.render);
    },

    load: function() {
      client.home();
    },

    render: function(data) {
      var html = this.template(data);
      this.$el.html(html);
      return this;
    }

  });

  return new HomeView();
});
