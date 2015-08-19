define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/drawer-user-account-error',
  '_templates'
], function ($, _, Backbone, client ,currentUser, ViewError, templates) {
  var DrawerUserEditMailView = Backbone.View.extend({

    template: templates['drawer-user-account-mail.html'],

    events: {
      'submit .form-mail'       : 'onSubmitMail'
    },

    initialize: function(options) {
    },

    render: function() {
      this.$el.html(this.template);

      this.errorView = new ViewError ({
        el : this.$('.error')
      });

      return this;
    },

    onSubmitMail: function(event) {
      event.preventDefault();

      if (this.$('.email-sub').val().length < 1) {
        this.errorView.render('empty');
        this.$('.form-mail').addClass('has-error');
      } else {
        client.userChangeMail(currentUser.get("user_id"), this.$('.email-sub').val());
        this.$('.form-mail').html(templates['spinner.html']);
      }
    }

  });

  return DrawerUserEditMailView;
});