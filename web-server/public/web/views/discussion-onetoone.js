var $ = require('jquery');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var EventsView = require('./discussion-events');
var InputView = require('./discussion-input');
var date = require('../libs/date');

var OneToOnePanelView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  template: require('../templates/discussion-onetoone.html'),

  events: {
    'click .ban-user': 'banUser',
    'click .deban-user': 'debanUser'
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
      el: this.$el,
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

    if (data.location) {
      data.user_location = data.location;
    }
    // render
    var html = this.template(data);
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);

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

      // refocus an offline one after few times
      date.from('fromnow', this.$('.ago span'));
    } else {
      this.$el.hide();
    }
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

  // only care about models to set a viewed
  onMarkAsViewed: function (data) {
    if (data.get('unviewed') === true) {
      return;
    }

    this.eventsView.hideUnviewedBlocks();
  }
});

module.exports = OneToOnePanelView;
