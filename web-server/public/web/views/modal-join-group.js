var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../libs/app');

var ModalJoinGroupView = Backbone.View.extend({
  template: require('../templates/modal-join-group.html'),

  events: {
    'click .confirm-request': 'onConfirmRequest',
    'click .confirm-password': 'onConfirmPassword',
    'click .confirm-email': 'onConfirmEmail',
    'click .change-option': 'onChangeOption'
  },

  initialize: function (options) {
    this.data = options.data;
    this.render();
  },

  render: function () {
    this.$el.html(this.template({data: this.data}));

    // error and success
    this.$error = this.$('.error').hide();
    this.$success = this.$('.success').hide();

    // button
    this.$buttonRequest = this.$('#button-request').hide();
    this.$buttonPassword = this.$('#button-password').hide();
    this.$buttonEmail = this.$('#button-email').hide();

    // Options
    this.$currentOption;
    this.$('.join-request').hide();
    this.$('.join-password').hide();
    this.$('.join-email').hide();
    this.$('.join-other').hide();

    this.showOptions();
    return this;
  },

  showOptions: function () {
    var selectClass;
    if (this.getNbrOptions(this.data) > 1) {
      if (this.data.allowed_domains) {
        this.$buttonEmail.show();
      }
      if (this.data.password) {
        this.$buttonPassword.show();
        selectClass = '.join-password';
      }
      if (this.data.request) {
        this.$buttonRequest.show();
        selectClass = '.join-request';
      }
      this.$(selectClass).show();
      this.$currentOption = this.$(selectClass).show();
    } else {
      selectClass = (this.data.request)
        ? '.join-request'
        : (this.data.password)
        ? '.join-password'
        : (this.data.allowed_domains)
        ? '.join-email'
        : '.join-other';
      this.$currentOption = this.$(selectClass).show();
    }
  },

  getNbrOptions: function () {
    var result = 0;
    if (this.data.allowed_domains) {
      result++;
    }
    if (this.data.password) {
      result++;
    }
    if (this.data.request) {
      result++;
    }
    return result;
  },

  onChangeOption: function ($event) {
    this.resetMessage();
    var option = $($event.currentTarget);
    $(this.$currentOption).hide();
    if (option.attr('id') === 'button-request') {
      this.$currentOption = this.$('.join-request').show();
    } else if (option.attr('id') === 'button-password') {
      this.$currentOption = this.$('.join-password').show();
    } else if (option.attr('id') === 'button-email') {
      this.$currentOption = this.$('.join-email').show();
    }
  },

  onConfirmRequest: function () {
    this.resetMessage();
    if (!this.data.request) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }
    var message = this.$('.input-request').val();

    client.groupJoinRequest(this.data.group_id, message, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'already-member' || response.err === 'already-allowed') {
          app.trigger('askMembership');
          this.trigger('close');
        } else if (response.err === 'allow-pending' || response.err === 'message-wrong-format') {
          $(this.$error).text(i18next.t('chat.allowed.error.' + response.err)).show();
        } else if (response.err === 'not-confirmed') {
          $(this.$error).text(i18next.t('chat.form.errors.' + response.err)).show();
        } else {
          $(this.$error).text(i18next.t('global.unknownerror')).show();
        }
      } else {
        $(this.$success).text(i18next.t('chat.joingroup.options.request.success')).show();
      }
    }, this));
  },

  onConfirmPassword: function () {
    this.resetMessage();
    var password = this.$('.input-password').val();

    if (!password || !this.data.password) {
      return $(this.$error).text(i18next.t('chat.joingroup.options.password.error')).show();
    }
    client.groupJoin(this.data.group_id, password, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'wrong-password' || response.err === 'params-password') {
          $(this.$error).text(i18next.t('chat.joingroup.options.password.error')).show();
        } else {
          $(this.$error).text(i18next.t('global.unknownerror')).show();
        }
      } else if (response.success) {
        app.trigger('joinGroup', {name: this.data.name, popin: false});
        this.trigger('close');
      }
    }, this));
  },

  onConfirmEmail: function () {
    this.resetMessage();
    var selectDomain = this.$('.select-domain').val();
    var mail = this.$('.input-email').val() + selectDomain;
    if (!this.data.allowed_domains || !this.data.allowed_domains.length) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }

    if (_.indexOf(this.data.allowed_domains, selectDomain) === -1) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }

    client.accountEmail(mail, 'add', _.bind(function (response) {
      if (response.success) {
        $(this.$success).html(i18next.t('chat.joingroup.options.email.success', { email: mail })).show();
      } else {
        if (response.err === 'mail-already-exist') {
          $(this.$error).text(i18next.t('chat.joingroup.options.email.error')).show();
        } else if (response.err === 'wrong-format') {
          $(this.$error).text(i18next.t('account.email.error.format')).show();
        } else {
          $(this.$error).text(i18next.t('global.unknownerror')).show();
        }
      }
    }, this));
  },

  resetMessage: function () {
    $(this.$error).hide();
    $(this.$success).hide();
  },

  close: function () {
    this.trigger('close');
  }
});

module.exports = ModalJoinGroupView;