define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerUserErrorView = Backbone.View.extend({

    template: templates['drawer-user-account-error.html'],

    events: {},

    initialize: function(options) {
    },

    render: function(error) {
      this.$el.html(this.template({error: error}));
      return this;
    }

  });

  return DrawerUserErrorView;
});