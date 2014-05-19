define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/user.html'
], function ($, _, Backbone, userTemplate) {
  var UsersView = Backbone.View.extend({

    tagName: 'div',

    template: _.template(userTemplate),

    initialize: function(options) {
      this.render();
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }

  });

  return UsersView;
});