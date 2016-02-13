var $ = require('jquery');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var TopicView = require('./room-topic');

var RoomHeaderView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion-header-room',

  template: require('../templates/discussion-room-header.html'),

  events: {
    'click .share .facebook': 'shareFacebook',
    'click .share .twitter': 'shareTwitter',
    'click .share .googleplus': 'shareGoogle'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:allow_group_member', this.render);
    this.listenTo(this.model, 'change:mode', this.render);

    this.render();

    this.topicView = new TopicView({
      el: this.$('.topic'),
      model: this.model
    });
  },
  render: function () {
    var data = this.model.toJSON();

    // owner
    data.isOwner = this.model.currentUserIsOwner();
    data.isOp = this.model.currentUserIsOp();
    data.isAdmin = app.user.isAdmin();

    data.room_id = this.model.get('id');
    data.avatar = common.cloudinary.prepare(data.avatar, 100);
    data.poster = data.poster || '';
    data.url = this.model.getUrl();
    data.mode = this.model.get('mode');
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

    // render
    var html = this.template({
      data: data
    });
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);

    this.initializeTooltips();

    return this;
  },
  _remove: function () {
    this.topicView._remove();
    this.remove();
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
  }
});

module.exports = RoomHeaderView;
