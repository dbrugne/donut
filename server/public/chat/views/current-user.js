define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/current-user.html'
], function ($, _, Backbone, client, currentUser, currentUserTemplate) {
  var CurrentUserView = Backbone.View.extend({

    template: _.template(currentUserTemplate),

    el: $('#block-current-user'),

    events: {

    },

    initialize: function(options) {
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },

    render: function() {
      var data = currentUser.toJSON();

      data.welcome = 'Nice to see you,'; // @todo : random hello

      var html = this.template(data);
      this.$el.html(html);
      return this;
    }

  });

  return CurrentUserView;
});
