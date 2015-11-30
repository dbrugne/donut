var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../libs/app');

var JoinGroupOptionsView = Backbone.View.extend({
  template: require('../templates/join-group-options.html'),

  events: {
    'click .change-option': 'onChangeOption',
    'click .confirm-request': 'onConfirmRequest',
    'click .confirm-password': 'onConfirmPassword',
    'click .confirm-mail': 'onConfirmMail',
    'click .open-user-account': 'onClose'
  },

  initialize: function (options) {
    this.model = options.model;
  },

  render: function (data) {
    this.data = data;
    var html = this.template({data: data});
    this.$el.html(html);

    // error and success
    this.$error = this.$('.join-error').hide();
    this.$success = this.$('.join-success').hide();

    // button
    this.$buttonRequest = this.$('#button-request').hide();
    this.$buttonPassword = this.$('#button-password').hide();
    this.$buttonMail = this.$('#button-mail').hide();

    // Options
    this.$currentOption;
    this.$('.join-request').hide();
    this.$('.join-password').hide();
    this.$('.join-mail').hide();

    this.showOptions();
    return this;
  },

  showOptions: function () {
    var selectClass;
    if (this.getNbrOptions(this.data) > 1) {
      if (this.data.mail) {
        this.$buttonMail.show();
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
        : (this.data.mail)
        ? '.join-mail'
        : 'other';
      this.$currentOption = this.$(selectClass).show();
    }
  },

  getNbrOptions: function () {
    var result = 0;
    if (this.data.mail) {
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
    } else if (option.attr('id') === 'button-mail') {
      this.$currentOption = this.$('.join-mail').show();
    }
  },

  onConfirmRequest: function () {
    this.resetMessage();
    if (!this.data.request) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }
    var message = this.$('.input-join-request').val();

    client.groupJoinRequest(this.model.get('group_id'), message, _.bind(function (data) {
      if (data.err) {
        if (data.err === 'member' || data.err === 'allowed') {
          this.model.trigger('joinGroup');
        } else if (data.err === 'allow-pending' || data.err === 'message-wrong-format') {
          $(this.$error).text(i18next.t('chat.allowed.error.' + data.err)).show();
        } else if (data.err === 'not-confirmed') {
          $(this.$error).text(i18next.t('chat.form.errors.' + data.err)).show();
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
    if (!this.data.password) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }
    var password = this.$('.input-join-password').val();

    client.groupJoin(this.model.get('group_id'), password, _.bind(function (data) {
      if (data.err) {
        if (data.err === 'wrong-password' || data.err === 'params-password') {
          $(this.$error).text(i18next.t('chat.password.wrong-password')).show();
        } else {
          $(this.$error).text(i18next.t('global.unknownerror')).show();
        }
      } else if (data.success) {
        app.trigger('joinGroup', {name: this.model.get('name'), popin: false});
        this.trigger('onClose');
      }
    }, this));
  },

  onConfirmMail: function () {
    this.resetMessage();
    if (!this.data.mail) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }
    if (!this.data.allowed_domains || !this.data.allowed_domains.length) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }

    var selectDomain = this.$('.join-domain').val();
    if (_.indexOf(this.data.allowed_domains, selectDomain) === -1) {
      return $(this.$error).text(i18next.t('global.unknownerror')).show();
    }

    var mail = this.$('.input-join-mail').val() + selectDomain;
    client.accountEmail(mail, 'add', _.bind(function (response) {
      if (response.success) {
        $(this.$success).html(i18next.t('chat.joingroup.options.mail.success')).show();
      } else {
        $(this.$error).text((i18next.t('global.unknownerror')).show());
      }
    }, this));
  },

  onClose: function () {
    this.trigger('onClose');
  },

  resetMessage: function () {
    $(this.$error).hide();
    $(this.$success).hide();
  }
});

module.exports = JoinGroupOptionsView;
