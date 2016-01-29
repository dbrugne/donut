var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');

module.exports = Backbone.View.extend({
  template: require('../templates/modal-choose-username.html'),

  events: {
    'click .submit': 'onSubmit',
    'keyup input[type="text"]': 'onKeyUp'
  },

  initialize: function () {
    // is user lost connection during username choosing, hide this modal
    // will be display again on next welcome
    this.listenTo(app.client, 'disconnect', _.bind(function () {
      this.trigger('close');
    }, this), this);

    this.render();
  },

  render: function () {
    this.$el.html(this.template({data: this.data}));

    // error and success
    this.$error = this.$('.error');
    this.$success = this.$('.success');

    this.$inputBlock = this.$('.input');
    this.$input = this.$inputBlock.find('input[type="text"]');
    return this;
  },
  onKeyUp: function (event) {
    var key = keyboard.getLastKeyCode(event);
    if (key.key === keyboard.RETURN) {
      this.onSubmit();
    }
  },
  onSubmit: function () {
    this.resetMessage();
    var username = this.$input.val();

    if (this._validateInput()) {
      app.client.userUpdate({username: username}, _.bind(function (response) {
        if (response.err) {
          return this.$error.text(i18next.t('chat.form.errors.' + response.err)).show();
        }

        app.client.connect();
      }, this));
    }
  },
  _validateInput: function () {
    var username = this.$input.val();
    if (!common.validate.username(username)) {
      this.$error.text(i18next.t('chat.form.errors.username-format'));
      this.$error.show();
      return false;
    }

    return true;
  },
  resetMessage: function () {
    this.$error.hide();
    this.$success.hide();
  }
});
