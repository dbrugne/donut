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
    'click .confirm-password': 'onConfirmPassword'
  },

  initialize: function (options) {
    this.model = options.model;
  },

  render: function (response) {
    this.$el.html(this.template);
    // button
    this.$buttonRequest = this.$('#button-request').hide();
    this.$buttonPassword = this.$('#button-password').hide();
    this.$buttonMail = this.$('#button-mail').hide();

    // Options
    this.$currentOption;
    this.$('.join-request').hide();
    this.$('.join-password').hide();
    this.$('.join-mail').hide();

    this.showOptions(response);
    return this;
  },

  showOptions: function (response) {
    var selectClass;
    if (this.getNbrOptions(response) > 1) {
      if (response.mail) {
        this.$buttonMail.show();
      }
      if (response.password) {
        this.$buttonPassword.show();
        selectClass = '.join-password';
      }
      if (response.request) {
        this.$buttonRequest.show();
        selectClass = '.join-request';
      }
      this.$(selectClass).show();
      this.$currentOption = this.$(selectClass).show();
    } else {
      selectClass = (response.request)
        ? '.join-request'
        : (response.password)
        ? '.join-password'
        : (response.mail)
        ? '.join-mail'
        : 'other';
      this.$currentOption = this.$(selectClass).show();
    }
  },

  getNbrOptions: function (response) {
    var result = 0;
    if (response.mail) {
      result++;
    }
    if (response.password) {
      result++;
    }
    if (response.request) {
      result++;
    }
    return result;
  },

  onChangeOption: function ($event) {
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
    var message = this.$('.input-join-request').val();

    client.groupJoinRequest(this.model.get('group_id'), message, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'member' || response.err === 'allowed') {
          this.model.trigger('joinGroup');
        } else if (response.err === 'allow-pending' || response.err === 'message-wrong-format') {
          app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
        } else if (response.err === 'not-confirmed') {
          app.trigger('alert', 'error', i18next.t('chat.form.errors.' + response.err));
        } else {
          app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
      } else {
        app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
      }
    }, this));
  },

  onConfirmPassword: function () {
    var password = this.$('.input-join-password').val();

    client.groupJoin(this.model.get('group_id'), password, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'wrong-password' || response.err === 'params-password') {
          app.trigger('alert', 'error', i18next.t('chat.password.wrong-password'));
        } else {
          app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
      } else if (response.success) {
        app.trigger('joinGroup', {name: this.model.get('name'), popin: false});
      }
    }, this));
  }
});

module.exports = JoinGroupOptionsView;
