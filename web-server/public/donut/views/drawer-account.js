define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/drawer-account-email',
  'views/drawer-account-password',
  '_templates'
], function ($, _, Backbone, client, currentUser, EmailView, PasswordView,templates) {
  var DrawerUserEditView = Backbone.View.extend({

    template: templates['drawer-account.html'],

    id: 'user-account',

    events: {},

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userRead(currentUser.get('username'), function(data) {
        that.user = data;
        that.onResponse(data);
      });
    },

    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },

    onResponse: function(user) {
      // colorize drawer .opacity
      if (user.color)
        this.trigger('color', user.color);

      var html = this.template({user: user});
      this.$el.html(html);

      this.emailView = new EmailView ({
        el : this.$(".email-container"),
        user: this.user,
        model: this.model
      });
      this.passwordView = new PasswordView ({
        el : this.$(".password-container"),
        user: this.user,
        model: this.model
      });
    }

  });

  return DrawerUserEditView;
});