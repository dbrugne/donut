define([
  'jquery',
  'underscore',
  'backbone',
  'views/alert',
], function ($, _, Backbone, AlertView) {

  var MainView = Backbone.View.extend({

    el: $("body"),

    $content: null,

    currentView: null,

    events: {
    },

    initialize: function() {
      this.$content = this.$el.find('#content');
      // bind to objects

      // generate and attach subviews
      this.alertView = new AlertView({mainView: this});
    },
    render: function() {
      this.$content.html(this.currentView.$el);
      return this;
    },
    setNavigationActive: function(key) {
      this.$el.find('.nav.navbar-nav li').removeClass('active');
      this.$el.find('.nav.navbar-nav li.'+key).addClass('active');
    },
    alert: function(type, message) {
      type = type || 'info';
      this.alertView.show(type, message);
    }

  });

  return MainView;
});