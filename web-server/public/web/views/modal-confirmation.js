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

  initialize: function (options) {},
  render: function () {
    this.$inputBlock = this.$('.input');
    this.$input = this.$inputBlock.find('input[type="text"]');
    this.$message = this.$('.message');

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
      if (this.confirmed)
        this.confirmCallback(this.$input.val()); // confirm
      else if (_.isFunction(this.cancelCallback))
        this.cancelCallback(); // cancel

      this._reset();
    }, this));

    this.isRendered = true; // avoid to early rendering on page load (cause bootstrap is not already loaded)
    return this;
  },
  _reset: function () {
    this.$inputBlock.show();
    this.$input.val('');
    this.$message.text('');
    this.confirmCallback = null;
    this.cancelCallback = null;
    this.options = null;
    this.confirmed = false;

    // unbind 'enter'
    $(document).off('keypress');
  },
  open: function (options, confirmCallback, cancelCallback) {
    if (!this.isRendered)
      this.render();

    this.options = options || {};
    this.confirmCallback = confirmCallback;
    this.cancelCallback = cancelCallback || _.noop;

    // input field
    if (this.options.input)
      this.$inputBlock.show();
    else
      this.$inputBlock.hide();

    // set message
    if (this.options.message) {
      if (this.options.message === 'mode-change') {
        this.$message.text(i18next.t('chat.confirmation.message.modechange'));
      } else if (this.options.message === 'refuse-user') {
        this.$message.text(i18next.t('chat.confirmation.message.refuseuser', {username: this.options.username}));
      } else if (this.options.message === 'accept-user') {
        this.$message.text(i18next.t('chat.confirmation.message.acceptuser', {username: this.options.username}));
      } else if (this.options.message === 'disallow-user') {
        this.$message.text(i18next.t('chat.confirmation.message.disallowuser', {username: this.options.username}));
      }
    }
    // bind 'enter' only when showing popin
    var that = this;
    $(document).keypress(function (e) {
      if (e.which == 13) {
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