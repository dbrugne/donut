var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../models/app');
var client = require('../client');
var EventsView = require('./events');
var InputView = require('./input');
var confirmationView = require('./modal-confirmation');

var OneToOnePanelView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  hasBeenFocused: false,

  template: require('../templates/discussion-onetoone.html'),

  events: {
    'click .ban-user': 'banUser',
    'click .deban-user': 'debanUser'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:poster', this.onPoster);
    this.listenTo(this.model, 'change:location', this.onLocation);
    this.listenTo(this.model, 'change:website', this.onWebsite);
    this.listenTo(this.model, 'change:status', this.onStatus);
    this.listenTo(this.model, 'change:banned', this.onBannedChange);

    this.render();

    this.eventsView = new EventsView({
      el: this.$('.events'),
      model: this.model
    });
    this.inputView = new InputView({
      el: this.$('.input'),
      model: this.model
    });
  },
  render: function () {
    var data = this.model.toJSON();

    // avatar
    data.avatar = common.cloudinary.prepare(data.avatar, 100);

    // url
    data.url = '/user/' + ('' + data.username).toLocaleLowerCase();

    // dropdown
    data.dropdown = require('../templates/dropdown-one-actions.html')({
      data: data
    });

    // render
    var html = this.template(data);
    this.$el.html(html);
    this.$el.hide();

    // other
    this.onStatus();

    return this;
  },
  removeView: function (model) {
    this.eventsView._remove();
    this.inputView._remove();
    this.remove();
  },
  changeColor: function () {
    if (this.model.get('focused')) {
      app.trigger('changeColor', this.model.get('color'));
    }
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();

      // need to load history?
      if (!this.hasBeenFocused) {
        this.onFirstFocus();
      }
      this.hasBeenFocused = true;

      // refocus an offline one after few times
      this.$('.ago span').momentify('fromnow');
    } else {
      this.$el.hide();
    }
  },
  onFirstFocus: function () {
    // @todo : on reconnect (only), remove all events in view before requesting history
    this.eventsView.requestHistory('bottom');
    this.eventsView.scrollDown();
  },

  /**
   * Update user details methods
   */

  onColor: function (model, value, options) {
    this.changeColor();
    this.onPoster(model, model.get('poster'), options);
  },
  onAvatar: function (model, value, options) {
    var url = common.cloudinary.prepare(value, 100);
    this.$('.header .avatar img').attr('src', url);
  },
  onPoster: function (model, url, options) {
    this.$('div.side').css('background-image', 'url(' + url + ')');
    this.$('div.side').removeClass('poster-empty');
    if (url === '') {
      this.$('div.side').addClass('poster-empty');
    }
  },
  onLocation: function (model, value, options) {
    this.$('.header .location').html(value);
  },
  onWebsite: function (model, value, options) {
    this.$('.header .website').text(value);
  },
  onStatus: function () {
    if (this.model.get('status') === 'online') {
      this.$('.header .status-block em').text(i18next.t('global.online'));
      this.$('.header .status')
        .removeClass('offline online')
        .addClass('online');
      this.$('.ago').hide();
    } else {
      this.$('.header .status-block em').text(i18next.t('global.offline'));
      this.$('.header .status')
        .removeClass('offline online')
        .addClass('offline');

      var $ago = this.$('.ago span');
      $ago.attr('data-time', this.model.get('onlined'));
      $ago.momentify('fromnow');
      this.$('.ago').show();
    }
  },
  onBannedChange: function (model, value, options) {
    if (value === true) {
      this.$('#onetoone .user').addClass('is-banned');
    } else {
      this.$('#onetoone .user').removeClass('is-banned');
    }
  }
});


module.exports = OneToOnePanelView;