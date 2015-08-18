define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerUserEditPasswordView = Backbone.View.extend({

    template: templates['drawer-user-account-password.html'],

    errorTemplate: templates['drawer-user-account-error.html'],

    events: {
      'submit .form-password'  : 'onSubmitPassword'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$el.html(this.template());
      this.listenTo(currentUser, 'passwordEdit', this.onPasswordResponse);
      return this;
    },

    onPasswordResponse: function () {
      console.log('test');
      this.$el.html("response !");
    },

    onSubmitPassword: function() {
      if (this.$('.input-password').val() === this.$('.input-password-confirm').val() && this.$('.input-password').val().length >= 6) {
        client.userChangePassword(currentUser.get("user_id"), this.$('.input-password').val());
        this.$('.form-password').html(templates['spinner.html']);
      }
      else if (this.$('.input-password').val().length >= 6) {
        this.$('.form-password').addClass('has-error');
        this.$('.error-password').html(this.errorTemplate({error: "match"}));
      } else {
        this.$('.form-password').addClass('has-error');
        this.$('.error-password').html(this.errorTemplate({error: "length"}));
      }
    }

  });

  return DrawerUserEditPasswordView;
});
