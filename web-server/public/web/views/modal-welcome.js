var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');

var WelcomeModalView = Backbone.View.extend({
  el: $('#welcome'),

  template: require('../templates/cards.html'),

  events: {
    'hidden.bs.modal': 'onHidden',
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

    this.cardsView.render({fill: false, rooms: {list: welcome.featured}});

    this.listenTo(this.cardsView, 'onClose', function (event) {
      this.hide();
    });
    return this;
  },
  show: function () {
    this.$el.modal('show');
  },
  hide: function () {
    this.$el.modal('hide');
  },
  onHidden: function () {
    // set welcome as false on user if checkbox is checked
    if (this.$("input[type='checkbox'].avoid").prop('checked') === true) {
      app.client.userPreferencesUpdate({'browser:welcome': false}, _.noop);
    }
  },
  onHide: function (event) {
    console.log(event);
  },
  onClose: function (event) {
    this.hide();
  }

});

module.exports = WelcomeModalView;
