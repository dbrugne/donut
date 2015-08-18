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

    mailView: '',

    passwordView: '',

    user: '',

    events: {
      'click #email-modal-link'     : 'onShowFormEmail',
      'click #password-modal-link'  : 'onShowFormPassword',
    },

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
        el : this.$(".mail-form-container"),
        model: this.model
      });

      this.passwordView = new ViewPassword ({
        el : this.$(".password-form-container"),
        model: this.model
      });
    },

    onShowFormPassword: function() {
      this.$('#password-modal-link').hide();
      this.passwordView.render();
    },

    onShowFormEmail: function() {
      this.$('#email-modal-link').hide();
      this.mailView.render();
    }

  });

  return DrawerUserEditView;
});