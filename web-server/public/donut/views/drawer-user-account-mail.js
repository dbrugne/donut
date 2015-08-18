define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerUserEditMailView = Backbone.View.extend({

    template: templates['drawer-user-account-mail.html'],

    errorTemplate: templates['drawer-user-account-error.html'],

    events: {
      'submit .form-mail'       : 'onSubmitMail'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$el.html(this.template);
      return this;
    },

    onSubmitMail: function() {
      if (this.$('.email-sub').val().length < 1) {
        this.$('.error').html(this.errorTemplate({error: 'empty'}));
        this.$('.form-mail').addClass('has-error');
      } else {
        client.userChangeMail(currentUser.get("user_id"), this.$('.email-sub').val());
        this.$('.form-mail').html(templates['spinner.html']);
      }
    }

  });

  return DrawerUserEditMailView;
});