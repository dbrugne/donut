define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'views/discussion',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, client, DiscussionView, confirmationView, _templates) {
  var OneToOnePanelView = DiscussionView.extend({

    template: _templates['discussion-onetoone.html'],
    events: {
      'click .ban-user': 'banUser',
      'click .deban-user': 'debanUser'
    },

    _initialize: function () {
      this.listenTo(this.model, 'change:color', this.onColor);
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);
      this.listenTo(this.model, 'change:location', this.onLocation);
      this.listenTo(this.model, 'change:website', this.onWebsite);
      this.listenTo(this.model, 'change:status', this.onStatus);
      this.listenTo(this.model, 'change:banned', this.onBannedChange);

      this.colorify();
      this.onStatus();
    },
    _remove: function (model) {
    },
    _renderData: function () {
      var data = this.model.toJSON();

      data.avatar = $.cd.userAvatar(data.avatar, 100);
      data.poster = $.cd.poster(data.poster);
      data.url = '/user/' + ('' + data.username).toLocaleLowerCase();

      return data;
    },
    _render: function () {
      this.$el.find('.website').linkify();
    },
    _focus: function () {
      this.$el.find('.ago span').momentify('fromnow'); // refocus an offline one after few times
    },
    _unfocus: function () {
    },

    /**
     * Update user details methods
     */

    onColor: function (model, value, options) {
      this.colorify();
      this.onPoster(model, model.get('poster'), options);
    },
    onAvatar: function (model, value, options) {
      var url = $.cd.userAvatar(value, 100);
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function (model, value, options) {
      var url = $.cd.poster(value);
      this.$el.find('div.side').css('background-image', 'url(' + url + ')');
    },
    onLocation: function (model, value, options) {
      this.$el.find('.header .location').html(value);
    },
    onWebsite: function (model, value, options) {
      this.$el.find('.header .website').text(value);
      this.$el.find('.header .website').linkify();
    },
    onStatus: function () {
      if (this.model.get('status') == 'online') {
        this.$el.find('.header .status-block em').text($.t("global.online"));
        this.$el.find('.header .status')
          .removeClass('offline online')
          .addClass('online');
        this.$el.find('.ago').hide();
      } else {
        this.$el.find('.header .status-block em').text($.t("global.offline"));
        this.$el.find('.header .status')
          .removeClass('offline online')
          .addClass('offline');

        var $ago = this.$el.find('.ago span');
        $ago.attr('data-time', this.model.get('onlined'));
        $ago.momentify('fromnow');
        this.$el.find('.ago').show();
      }
    },
    onBannedChange: function(model, value, options) {
      if (value === true) {
        this.$('#onetoone .user').addClass('is-banned');
      } else {
        this.$('#onetoone .user').removeClass('is-banned');
      }
    },
    banUser: function (event) {
      event.preventDefault();

      var uid = $(event.currentTarget).data('uid');
      if (!uid)
        return;

      var that = this;
      confirmationView.open({input: true}, function (reason) {
        client.userBan(uid, reason);
      });4
    },
    debanUser: function (event) {
      event.preventDefault();

      var uid = $(event.currentTarget).data('uid');
      if (!uid)
        return;

      var that = this;
      confirmationView.open({}, function () {
        client.userDeban(uid);
      });
    }
  });

  return OneToOnePanelView;
});