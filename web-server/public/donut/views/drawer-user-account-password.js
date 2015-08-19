define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/drawer-user-account-error',
  '_templates'
], function ($, _, Backbone, client ,currentUser, ViewError, templates) {
  var DrawerUserEditPasswordView = Backbone.View.extend({

    template: templates['drawer-user-account-password.html'],

    events: {
      'submit .form-password'  : 'onSubmitPassword'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$el.html(this.template());

      this.errorView = new ViewError ({
        el : this.$('.error-password'),
        model: this.model
      });

      return this;
    },

    onSubmitPassword: function(event) {
      event.preventDefault();

      if (this.$('.input-password').val() === this.$('.input-password-confirm').val() && this.$('.input-password').val().length >= 6) {
        client.userChangePassword(currentUser.get("user_id"), this.$('.input-password').val());
        this.$('.form-password').html(templates['spinner.html']);
      }
      else if (this.$('.input-password').val().length >= 6) {
        this.$('.form-password').addClass('has-error');
        this.errorView.render('match');
      } else {
        this.$('.form-password').addClass('has-error');
        this.errorView.render('length');
      }
    }

  });

  return DrawerUserEditPasswordView;
});
