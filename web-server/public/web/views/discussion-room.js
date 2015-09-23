var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../models/app');
var client = require('../libs/client');
var EventsView = require('./events');
var InputView = require('./input');
var currentUser = require('../models/current-user');
var confirmationView = require('./modal-confirmation');
var TopicView = require('./room-topic');
var UsersView = require('./room-users');

var RoomView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  hasBeenFocused: false,

  template: require('../templates/discussion-room.html'),

  events: {
    'click .op-user': 'opUser',
    'click .deop-user': 'deopUser',
    'click .kick-user': 'kickUser',
    'click .ban-user': 'banUser',
    'click .voice-user': 'voiceUser',
    'click .devoice-user': 'devoiceUser',
    'click .share .facebook': 'shareFacebook',
    'click .share .twitter': 'shareTwitter',
    'click .share .googleplus': 'shareGoogle'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:poster', this.onPoster);
    this.listenTo(this.model, 'change:posterblured', this.onPosterBlured);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'setPrivate', this.onPrivate);

    this.render();

    this.eventsView = new EventsView({
      el: this.$('.events'),
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
      el: this.$('.side .users'),
      model: this.model,
      collection: this.model.users
    });

    this.$privateTooltip = this.$('.private');
    if (this.model.get('mode') === 'public') {
      this.$privateTooltip.hide();
    }
  },
  render: function () {
    var data = this.model.toJSON();

    // owner
    var owner = this.model.get('owner').toJSON();
    data.owner = owner;
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

    // share widget
    var share = 'share-room-' + this.model.get('name').replace('#', '').toLocaleLowerCase();
    this.share = {
      class: share,
      selector: '.' + share
    };
    data.share = this.share.class;

    // dropdown
    data.dropdown = require('../templates/dropdown-room-actions.html')({
      data: data
    });

    // render
    var html = this.template(data);
    this.$el.html(html);
    this.$el.hide();

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
    this.model.fetchUsers();
  },

  /**
   * User actions methods
   */

  _showUserListModal: function () {
    if (this.topicView.isUserModelRequired()) {
      this.topicView.loadUserModal();
    }
  },

  opUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var that = this;
    confirmationView.open({}, function () {
      client.roomOp(that.model.get('id'), userId, null, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  deopUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var that = this;
    confirmationView.open({}, function () {
      client.roomDeop(that.model.get('id'), userId, null, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  kickUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomKick(that.model.get('id'), userId, null, reason);
    });
  },
  banUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomBan(that.model.get('id'), userId, null, reason);
    });
  },
  voiceUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    client.roomVoice(this.model.get('id'), userId, null);
  },
  devoiceUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }
    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomDevoice(that.model.get('id'), userId, null, reason);
    });
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
  onPrivate: function (data) {
    this.model.set('mode', 'private');
    this.$privateTooltip.show();
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
    this.$('[data-toggle="tooltip"]').tooltip();
  }

});


module.exports = RoomView;