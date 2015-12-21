var $ = require('jquery');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var EventsView = require('./events');
var InputView = require('./input');
var date = require('../libs/date');

var OneToOnePanelView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  hasBeenFocused: false,

  reconnect: false,

  template: require('../templates/discussion-onetoone.html'),

  events: {
    'click .ban-user': 'banUser',
    'click .deban-user': 'debanUser',
    'click .mark-as-viewed': 'removeUnviewedBlock',
    'click .jumpto': 'onScrollTo'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:realname', this.onRealname);
    this.listenTo(this.model, 'change:poster', this.onPoster);
    this.listenTo(this.model, 'change:location', this.onLocation);
    this.listenTo(this.model, 'change:website', this.onWebsite);
    this.listenTo(this.model, 'change:status', this.onStatus);
    this.listenTo(this.model, 'change:banned', this.onBannedChange);
    this.listenTo(this.model, 'change:unviewed', this.onMarkAsViewed);

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

    // dropdown
    data.dropdown = require('../templates/dropdown-one-actions.html')({
      data: data
    });

    // render
    var html = this.template(data);
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);
    this.$el.hide();

    this.$statusBlock = this.$('.header .status-block');

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

      if (this.reconnect) {
        this.onFirstFocusAfterReconnect();
      }
      this.hasBeenFocused = true;
      this.reconnect = false;

      // refocus an offline one after few times
      date.from('fromnow', this.$('.ago span'));
      this.eventsView.onScroll();
    } else {
      this.$el.hide();
    }
  },
  onFirstFocus: function () {
    this.eventsView.requestHistory('bottom');
    this.eventsView.scrollDown();
  },
  onFirstFocusAfterReconnect: function () {
    this.eventsView.replaceDisconnectBlocks();
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
  onRealname: function (model, value, options) {
    this.$('.header .name .realname').html('<span class="mr5">' + value + '</span>');
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
    this.$statusBlock.attr('class', 'status-block').addClass(this.model.get('status'));

    if (this.model.get('status') !== 'online') {
      var $ago = this.$('.ago span');
      $ago.attr('data-time', this.model.get('onlined'));
      date.from('fromnow', $ago);
    }
  },
  onBannedChange: function (model, value, options) {
    if (value === true) {
      this.$('#onetoone .user').addClass('is-banned');
    } else {
      this.$('#onetoone .user').removeClass('is-banned');
    }
  },

  removeUnviewedBlock: function (event) {
    event.preventDefault();
    var elt = $(event.currentTarget).closest('.unviewed-top ');
    var separator = $('#unviewed-separator-' + elt.data('id'));
    elt.fadeOut(1000, function () {
      elt.remove();
    });
    separator.fadeOut(1000, function () {
      separator.remove();
    });
  },
  // only care about models to set a viewed
  onMarkAsViewed: function (data) {
    if (data.get('unviewed') === true) {
      return;
    }

    this.eventsView.markAsViewed();
  },
  onScrollTo: function (event) {
    event.preventDefault();
    var elt = $(event.currentTarget);
    if (!elt.data('id')) {
      return this.removeUnviewedBlock(event);
    }

    var target = $('#unviewed-separator-' + elt.data('id'));
    if (!target) {
      return this.removeUnviewedBlock(event);
    }

    this.eventsView.scrollTo(target.position().top - 31, 1000);
  }
});

module.exports = OneToOnePanelView;
