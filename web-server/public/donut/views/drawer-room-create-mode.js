'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'common',
  'client',
  'i18next',
  '_templates'
], function ($, _, Backbone, app, common, client, i18next, templates) {
  var DrawerRoomCreateModeView = Backbone.View.extend({
    template: templates['drawer-room-create-mode.html'],

    id: 'drawer-room-create-mode',

    passwordPattern: /([^\s]{4,255})$/i,

    events: {
      'change input[name="mode"]': 'onChangeMode',
      'change [type="checkbox"]': 'onChoosePassword',
      'click .random-password': 'onRandomPassword'
    },

    initialize: function (options) {
      this.render(options);
    },

    render: function (options) {
      options.name = options.name
        ? options.name.replace('#', '')
        : '';
      var html = this.template(options);

      this.$el.html(html);
      this.$password = this.$('.input-password');
      if (!options.model || options.model.hasPassword === false) {
        this.$password.val(common.randomString());
      }

      this.$fieldPassword = this.$el.find('.field-password');
      this.$passwordBlock = this.$fieldPassword.find('.password-block');
      this.$toggleCheckbox = this.$el.find('#input-password-checkbox');

      return this;
    },

    onChangeMode: function (event) {
      var $target = $(event.currentTarget).first();
      if ($target.attr('type') === 'radio' && $target.attr('name') === 'mode') {
        if ($target.attr('value') !== 'private') {
          this.$fieldPassword.hide();
          this.$passwordBlock.hide();
        } else {
          this.$fieldPassword.show();
          this.$password.focus();
        }
      }
    },

    onChoosePassword: function (event) {
      // Display block on click
      if (this.$toggleCheckbox.is(':checked')) {
        this.$passwordBlock.show();
      } else {
        this.$passwordBlock.hide();
      }
    },

    onRandomPassword: function (event) {
      event.preventDefault();
      this.$password.val(common.randomString());
      this.$password.focus();
    },

    isValidMode: function () {
      return (common.validateMode(this.getMode()));
    },

    isValidPassword: function () {
      return (this.getMode() === 'public' ||
      (this.getMode() === 'private' && !this.$toggleCheckbox.is(':checked')) ||
      (this.getMode() === 'private' && this.$toggleCheckbox.is(':checked') && this.passwordPattern.test(this.getPassword())));
    },

    getMode: function () {
      return this.$el.find('input[name="mode"]:checked').val();
    },

    getPassword: function () {
      if (this.$toggleCheckbox.is(':checked')) {
        return this.$password.val();
      }

      return null;
    }

  });

  return DrawerRoomCreateModeView;
});
