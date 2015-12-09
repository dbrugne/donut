var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../libs/app');

module.exports = Backbone.View.extend({
  template: require('../templates/modal-choose-username.html'),

  events: {
    'click .submit': 'onSubmit'
  },

  initialize: function () {
    // is user lost connection during username choosing, hide this modal
    // will be display again on next 'welcome'
    this.listenTo(client, 'disconnect', _.bind(function () {
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
  onSubmit: function () {
    this.resetMessage();

    // @todo : listen for enter key to submit
    // @todo : validation

    var username = this.$input.val();
    console.log(username);
    client.userUpdate({username: username}, _.bind(function (response) {
      if (response.err) {
        return this.$error.text(response.err).show();
      }

      client.connect();
    }, this));
  },
  resetMessage: function () {
    this.$error.hide();
    this.$success.hide();
  }
});
