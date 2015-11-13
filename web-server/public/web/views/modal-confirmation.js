var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');

var ConfirmationModalView = Backbone.View.extend({
  el: $('#confirmation'),

  events: {
    'click .buttons .confirm': 'onConfirm'
  },

  confirmed: false,

  confirmCallback: null,

  cancelCallback: null,

  options: null,

  isRendered: false,

  initialize: function (options) {
  },
  render: function () {
    this.$inputBlock = this.$('.input');
    this.$input = this.$inputBlock.find('input[type="text"]');
    this.$inputPass = this.$('input[type="password"]');
    this.$bigInputArea = this.$('#big-input-textarea');
    this.$biginput = this.$('.big-input');
    this.$message = this.$('.message');
    this.$password = this.$('.password');
    this.$confirmMessage = this.$('.question');

    // Configure modal
    this.$el.modal({
      keyboard: true,
      show: false
    });

    // on modal shown
    this.$el.on('shown.bs.modal', _.bind(function (e) {
      this.$input.focus();
    }, this));

    // some callback action need to have modal properly closed before execution (e.g.: focus an element)
    this.$el.on('hidden.bs.modal', _.bind(function (e) {
      if (this.confirmed) {
        if (this.$input.val()) {
          this.confirmCallback(this.$input.val());
        } else if (this.$bigInputArea.val()) {
          this.confirmCallback(this.$bigInputArea.val());
        } else {
          this.confirmCallback(this.$inputPass.val());
        }
      } else if (_.isFunction(this.cancelCallback)) {
        this.cancelCallback(); // cancel
      }

      this._reset();
    }, this));

    this.isRendered = true; // avoid to early rendering on page load (cause bootstrap is not already loaded)
    return this;
  },
  _reset: function () {
    this.$inputBlock.show();
    this.$confirmMessage.show();
    this.$password.val('');
    this.$input.val('');
    this.$bigInputArea.val('');
    this.$message.text('');
    this.$inputPass.val('');
    this.confirmCallback = null;
    this.cancelCallback = null;
    this.options = null;
    this.confirmed = false;

    // unbind 'enter'
    $(document).off('keypress');
  },
  open: function (options, confirmCallback, cancelCallback) {
    if (!this.isRendered) {
      this.render();
    }

    this.options = options || {};
    this.confirmCallback = confirmCallback;
    this.cancelCallback = cancelCallback || _.noop;

    // input field
    if (this.options.input) {
      this.$inputBlock.show();
    } else {
      this.$inputBlock.hide();
    }

    // password
    if (this.options.password) {
      this.$password.show();
      this.$confirmMessage.hide();
    } else {
      this.$password.hide();
    }

    // area field
    if (this.options.area) {
      this.$biginput.show();
    } else {
      this.$biginput.hide();
    }
    // set message
    if (this.options.message) {
      if (this.options.message === 'mode-change') {
        this.$message.text(i18next.t('chat.confirmation.message.modechange'));
      } else if (this.options.message === 'ban-user') {
        this.$message.text(i18next.t('chat.confirmation.message.banuser'));
      } else if (this.options.message === 'deban-user') {
        this.$message.text(i18next.t('chat.confirmation.message.debanuser'));
      } else if (this.options.message === 'refuse-user') {
        this.$message.text(i18next.t('chat.confirmation.message.refuseuser', {username: this.options.username}));
      } else if (this.options.message === 'accept-user') {
        this.$message.text(i18next.t('chat.confirmation.message.acceptuser', {username: this.options.username}));
      } else if (this.options.message === 'disallow-user') {
        this.$message.text(i18next.t('chat.confirmation.message.disallowuser', {username: this.options.username}));
      } else if (this.options.message === 'ban-group-user') {
        this.$message.text(i18next.t('chat.confirmation.message.ban-group-user', {username: this.options.username}));
      } else if (this.options.message === 'deban-group-user') {
        this.$message.text(i18next.t('chat.confirmation.message.deban-group-user', {username: this.options.username}));
      } else if (this.options.message === 'invite') {
        this.$message.text(i18next.t('chat.confirmation.message.invite', {
          username: this.options.username,
          name: this.options.room_name
        }));
      } else if (this.options.message === 'request-allowance') {
        this.$message.html(i18next.t('chat.confirmation.message.requestallowance'));
      } else if (this.options.message === 'request-allowance-password') {
        this.$message.text(i18next.t('group.blocked'));
      } else if (this.options.message === 'op-group-user') {
        this.$message.text(i18next.t('chat.confirmation.message.op-group-user', {username: this.options.username}));
      } else if (this.options.message === 'deop-group-user') {
        this.$message.text(i18next.t('chat.confirmation.message.deop-group-user', {username: this.options.username}));
      } else if (this.options.message === 'add-email') {
        this.$message.text(i18next.t('chat.confirmation.message.add-email'));
        this.$input.attr('placeholder', '');
      } else if (this.options.message === 'send-email') {
        this.$message.text(i18next.t('chat.confirmation.message.send-email', {email: this.options.email}));
      } else if (this.options.message === 'delete-email') {
        this.$message.text(i18next.t('chat.confirmation.message.delete-email', {email: this.options.email}));
      } else if (this.options.message === 'change-email') {
        this.$message.text(i18next.t('chat.confirmation.message.', {email: this.options.email}));
      } else if (this.options.message === 'add-domain') {
        this.$message.text(i18next.t('chat.confirmation.message.add-domain'));
        this.$input.attr('placeholder', i18next.t('chat.confirmation.placeholder-domain'));
      } else if (this.options.message === 'delete-domain') {
        this.$message.text(i18next.t('chat.confirmation.message.delete-domain', {domain: this.options.domain}));
      }
    }
    // bind 'enter' only when showing popin
    var that = this;
    $(document).keypress(function (e) {
      if (e.which === 13) {
        that.onConfirm(e);
      }
    });

    this.$el.modal('show');
  },
  onConfirm: function (event) {
    event.preventDefault();

    this.confirmed = true;
    this.$el.modal('hide');
  }

});

module.exports = new ConfirmationModalView();
