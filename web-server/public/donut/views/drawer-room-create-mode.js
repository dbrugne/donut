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
], function ($, _, Backbone, app, common, client, i18next, _templates) {
  var DrawerRoomCreateModeView = Backbone.View.extend({
    template: _templates['drawer-room-create-mode.html'],

    id: 'drawer-room-create-mode',

    events: {
      'change input[name="mode"]': 'onChangeMode',
      'click [type="checkbox"]': 'onChoosePassword',
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
      this.$input = this.$el.find('.input');
      this.$errors = this.$('.errors');
      this.$password = this.$('.input-password');
      this.$password.val(common.randomString());

      this.$fieldPassword = this.$el.find('.field-password');
      this.$passwordBlock = this.$fieldPassword.find('.password-block');

      return this;
    },

    reset: function () {
      this.$errors.html('').hide();
      this.$el.removeClass('has-error').removeClass('has-success').val('');
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

    onChoosePassword: function(event) {
      // Display block on click
      var $target = $(event.currentTarget).first();
      if ($target.attr('type') === 'checkbox' && $target.attr('name') === 'input-password-checkbox' && $target.val() === 'on') {
        this.$passwordBlock.show();
      } else {
        this.$passwordBlock.hide();
      }
    },

    onRandomPassword: function (event) {
      event.preventDefault();
      this.$password.val(common.randomString());
      this.$password.focus();
    }

  });

  return DrawerRoomCreateModeView;
});
