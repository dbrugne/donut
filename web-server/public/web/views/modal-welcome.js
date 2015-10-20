var $ = require('jquery');
var Backbone = require('backbone');
var donutDebug = require('../libs/donut-debug');
var client = require('../libs/client');
var CardsView = require('./cards');

var debug = donutDebug('donut:modal-welcome');

var WelcomeModalView = Backbone.View.extend({
  el: $('#welcome'),

  template: require('../templates/cards.html'),

  events: {
    'hidden.bs.modal': 'onHide',
    'click .nothing, .list .room .join': 'onClose'
  },

  callback: null,

  initialize: function (options) {
    this.$el.modal({
      show: false
    });
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
  },
  render: function (welcome) {
    if (!welcome || !welcome.featured || !welcome.featured.length) {
      return;
    }

    this.cardsView.render({fill: false, cards: {list: welcome.featured}});

    return this;
  },
  show: function () {
    this.$el.modal('show');
  },
  hide: function () {
    this.$el.modal('hide');
  },
  onHide: function () {
    // set welcome as false on user if checkbox is checked
    if (this.$("input[type='checkbox'].avoid").prop('checked') === true) {
      client.userPreferencesUpdate({'browser:welcome': false}, function (data) {
        debug('user preference saved: ', data);
      });
    }
  },
  onClose: function (event) {
    this.hide();
  }

});

module.exports = WelcomeModalView;
