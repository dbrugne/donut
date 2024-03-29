var $ = require('jquery');
var Backbone = require('backbone');
var app = require('../libs/app');

var ConnectionModalView = Backbone.View.extend({
  el: $('#connection'),

  initialize: function (options) {
    this.listenTo(app.client, 'connecting', function () {
      this.onEvent('connecting');
    }, this);
    this.listenTo(app.client, 'connect', function () {
      this.onEvent('connect');
    }, this);
    this.listenTo(app.client, 'disconnect', function (reason) {
      this.onEvent('disconnect', reason);
    }, this);
    this.listenTo(app.client, 'reconnect', function (num) {
      this.onEvent('reconnect', num);
    }, this);
    this.listenTo(app.client, 'reconnect_attempt', function () {
      this.onEvent('reconnect_attempt');
    }, this);
    this.listenTo(app.client, 'reconnecting', function (num) {
      this.onEvent('reconnecting', num);
    }, this);
    this.listenTo(app.client, 'reconnect_error', function (err) {
      this.onEvent('reconnect_error', err);
    }, this);
    this.listenTo(app.client, 'reconnect_failed', function () {
      this.onEvent('reconnect_failed');
    }, this);
    this.listenTo(app.client, 'error', function (err) {
      this.onEvent('error', err);
    }, this);

    this.render();
  },
  render: function () {
    this.$el.modal({
      backdrop: 'static',
      keyboard: false,
      show: true
    });

    this.$error = this.$('.current .error').first();
    this.$all = this.$('.current > span');
    this.$errorMessage = this.$('.error-message').first();

    return this;
  },
  show: function () {
    this.$el.modal('show');
  },
  hide: function () {
    this.$el.modal('hide');
  },
  onEvent: function (event, data) {
    if (data && data.message && data.message === 'xhr poll error') {
      data = 'Unable to join server, please check your Internet link.';
    }

    this.$all.hide();
    switch (event) {
      case 'connect':
        this.$errorMessage.html('').hide();
        break;
      case 'reconnect':
        this.$errorMessage.html('').hide();
        break;
      case 'connecting':
      case 'reconnecting':
      case 'reconnect_error':
      case 'reconnect_attempt':
        this.$errorMessage.html(data).show();
        break;
      case 'error':
      case 'reconnect_failed':
        this.$error.css('display', 'inline');
        this.$errorMessage.html(data).show();
        break;
      case 'disconnect':
        this.$errorMessage.html(data).show();
        this.show();
        break;
    }
  }
});

module.exports = ConnectionModalView;
