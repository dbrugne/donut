define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/drawer-user-account-mail',
  'views/drawer-user-account-password',
  '_templates'
], function ($, _, Backbone, client ,currentUser, ViewMail, ViewPassword,templates) {
  var DrawerUserEditView = Backbone.View.extend({

    template: templates['drawer-user-account.html'],

    id: 'user-account',

    user: '',

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

      // color form
      this.$el.find('.user').colorify();

      this.mailView = new ViewMail ({
        el : this.$(".mail-form"),
        model: this.model
      });

      this.passwordView = new ViewPassword ({
        el : this.$(".password-form"),
        model: this.model
      });
    }

  });

  return DrawerUserEditView;
});