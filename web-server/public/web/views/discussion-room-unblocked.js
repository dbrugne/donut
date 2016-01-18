var $ = require('jquery');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var EventsView = require('./discussion-events');
var InputView = require('./discussion-input');
var TopicView = require('./room-topic');
var UsersView = require('./room-users');

var RoomView = Backbone.View.extend({
  template: require('../templates/discussion-room-unblocked.html'),

  events: {
    'click .share .facebook': 'shareFacebook',
    'click .share .twitter': 'shareTwitter',
    'click .share .googleplus': 'shareGoogle'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:poster', this.onPoster);
    this.listenTo(this.model, 'change:posterblured', this.onPosterBlured);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'change:allow_group_member', this.onChangeAllowGroupMember);
    this.listenTo(this.model, 'setPrivate', this.onPrivate);
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
    this.topicView = new TopicView({
      el: this.$('.topic'),
      model: this.model
    });
    this.usersView = new UsersView({
      el: this.$('.side'),
      model: this.model,
      collection: this.model.users
    });
  },
  render: function () {
    var data = this.model.toJSON();

    // owner
    data.isOwner = this.model.currentUserIsOwner();
    data.isOp = this.model.currentUserIsOp();
    data.isAdmin = this.model.currentUserIsAdmin();

    // avatar
    data.avatar = common.cloudinary.prepare(data.avatar, 100);

    // poster
    data.poster = data.poster || '';

    // id
    data.room_id = this.model.get('id');

    // url
    data.url = this.model.getUrl();

    // room mode
    data.mode = this.model.get('mode');

    // room default
    data.default = (this.model.get('group_id'))
      ? (this.model.get('group_default') === data.room_id)
      : false;

    // share widget
    var share = 'share-room-' + this.model.get('id');
    this.share = {
      class: share,
      selector: '.' + share
    };
    data.share = this.share.class;

    // dropdown
    var dropdown = require('../templates/dropdown-room-actions.html')({
      data: data
    });

    // render
    var html = this.template({
      data: data,
      dropdown: dropdown
    });
    this.$el.html(html);

    this.initializeTooltips();

    return this;
  },
  removeView: function () {
    this.eventsView._remove();
    this.inputView._remove();
    this.topicView._remove();
    this.usersView._remove();
    this.remove();
  },
  changeColor: function () {
    if (this.model.get('focused')) {
      app.trigger('changeColor', this.model.get('color'));
    }
  },

  /**
   * Update room details methods
   */

  onColor: function (model, value, options) {
    this.onAvatar(model, model.get('avatar'), options);
    this.onPoster(model, model.get('poster'), options);
    this.onPosterBlured(model, model.get('posterblured'), options);
    this.changeColor();
  },
  onAvatar: function (model, value) {
    var url = common.cloudinary.prepare(value, 100);
    this.$('.header img.avatar').attr('src', url);
  },
  onPoster: function (model, url, options) {
    this.$('div.side').css('background-image', 'url(' + url + ')');
    this.$('div.side').removeClass(function (index, css) {
      return (css.match(/(poster-[\w]{4,5})+/g) || []).join(' ');
    });
    if (url === '') {
      this.$('div.side').addClass('poster-empty');
    } else {
      this.$('div.side').addClass('poster-full');
    }
  },
  onPosterBlured: function (model, url) {
    this.$('div.blur').css('background-image', 'url(' + url + ')');
  },
  onChangeAllowGroupMember: function (model, value, options) {
    this.$('span.label').attr('data-original-title', i18next.t('global.mode.description.private' + (value
        ? '-group'
        : '')));
    this.$('span.label').text(i18next.t('global.mode.title.private' + (value
        ? '-group'
        : '')));
  },
  onPrivate: function (data) {
    this.model.set('mode', 'private');
    this.$('span.label').attr('data-original-title', i18next.t('global.mode.description.private' + (data.allow_user_request
        ? '-invites'
        : '') + (data.allow_group_member
        ? '-group'
        : '')));
    this.$('span.label').text(i18next.t('global.mode.title.private' + (data.allow_user_request
        ? '-invites'
        : '') + (data.allow_group_member
        ? '-group'
        : '')));
  },

  /**
   * Social sharing
   */
  shareFacebook: function () {
    $.socialify.facebook({
      url: this.model.getUrl(),
      name: i18next.t('chat.share.title', {name: this.model.get('name')}),
      picture: common.cloudinary.prepare(this.model.get('avatar'), 350),
      description: i18next.t('chat.share.description', {name: this.model.get('name')})
    });
  },
  shareTwitter: function () {
    $.socialify.twitter({
      url: this.model.getUrl(),
      text: i18next.t('chat.share.description', {name: this.model.get('name')})
    });
  },
  shareGoogle: function () {
    $.socialify.google({
      url: this.model.getUrl()
    });
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  // only care about models to set a viewed
  onMarkAsViewed: function (data) {
    if (data.get('unviewed') === true) {
      return;
    }

    this.eventsView.hideUnviewedBlocks();
  }
});

module.exports = RoomView;