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

    events: {
      'submit .form-password'       : 'onSubmitPassword',
      'click #password-modal-link'  : 'onShowFormPassword'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$el.html(this.template());


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
        //this.errorView.render('match');
      } else {
        this.$('.form-password').addClass('has-error');
        //this.errorView.render('length');
      }
    }

  });

  return DrawerUserEditPasswordView;
});
