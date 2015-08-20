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

    events: {
      'click #email-modal-link' : 'onShowFormEmail',
      'submit .form-mail'       : 'onSubmitMail'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$('.mail-form-container').html(this.template);

      this.$('.spinner').html(templates['spinner.html']);
      this.$('.spinner').hide();
      this.$('.error').hide();
      this.$('.success').hide();

      return this;
    },

    onShowFormEmail: function(event) {
      event.preventDefault();

      this.$('#email-modal-link').hide();
      this.render();
    },

    onSubmitMail: function(event) {
      event.preventDefault();

      var that = this;

      if (this.$('.email-sub').val().length < 1) {
        this.$('.form-mail').addClass('has-error');
        this.$('.error').show();
        this.$('.mail-error').text($.t('account.email.error.empty'));
      } else {
        this.$('.error').hide();
        this.$('.spinner').show();
        this.$('.form-mail').removeClass('has-error');

        client.userChangeMail(currentUser.get("user_id"), this.$('.email-sub').val(), function (data) {
          that.$('.spinner').hide();
          if (data.err) {
            that.$('.form-mail').addClass('has-error');
            that.$('.error').show();

            if (data.err === 'wrong-format')
              that.$('.mail-error').text($.t('account.email.error.format'));
            else if (data.err === 'same-mail')
              that.$('.mail-error').text($.t('account.email.error.alreadyyours'));
            else if (data.err === 'exist')
              that.$('.mail-error').text($.t('account.email.error.alreadyexists'));

          } else {
            that.$('.email-user').text(that.$('.email-sub').val());
            that.$('input').hide();
            that.$('.success').show();
          }
        });
      }
    }

  });

  return DrawerUserEditMailView;
});