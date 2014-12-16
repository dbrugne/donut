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
      var that = this;
      $.ajax('/rest/home', {
        success: function(data) {
          var html = that.template({data: data});
          that.$el.html(html);
        }
      });
      return this;
    }
  });

  return HomeView;
});