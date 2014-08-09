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

    hello: '',

    events: {

    },

    initialize: function(options) {
      this.listenTo(this.model, 'change', this.render);
//      this.render(); // bugfix: call render to early and jQuery plugins are not
      // yet configured
    },

    render: function() {
      var data = currentUser.toJSON();

      data.hello = this.hello;

      data.avatar = $.c.userAvatar(data.avatar, 'user-large');

      var html = this.template(data);
      this.$el.html(html);
      return this;
    }

  });

  return CurrentUserView;
});
