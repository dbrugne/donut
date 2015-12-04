// @todo cleanup unused libs

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../libs/app');

var ModalChooseUsernameView = Backbone.View.extend({
  template: require('../templates/modal-choose-username.html'),

  events: {
  },

  initialize: function () {
    this.render();
  },

  render: function () {
    this.$el.html(this.template({data: this.data}));

    // error and success
    this.$error = this.$('.error');
    this.$success = this.$('.success');

    return this;
  },

  resetMessage: function () {
    this.$error.hide();
    this.$success.hide();
  }
});

module.exports = ModalChooseUsernameView;
