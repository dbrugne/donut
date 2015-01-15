define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/home.html'
], function ($, _, Backbone, moment, htmlTemplate) {

  var HomeView = Backbone.View.extend({

    id: 'home',

    template: _.template(htmlTemplate),

    events: {
      "click .refresh": 'onRefresh'
    },

    initialize: function() {
    },
    render: function() {
      var that = this;
      $.ajax('/rest/home', {
        success: function(data) {
          if (data.time) {
            var dateObject = moment(data.time);
            data.refreshed = dateObject.format("Do/MM/YYYY à HH:mm:ss");
          }
          var html = that.template({data: data});
          that.$el.html(html);
        }
      });
      return this;
    },
    onRefresh: function(e) {
      this.render();
    }
  });

  return HomeView;
});