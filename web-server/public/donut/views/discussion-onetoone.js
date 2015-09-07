'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'common',
  'client',
  'views/discussion',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, i18next, common, client, DiscussionView, confirmationView, templates) {
  var OneToOnePanelView = DiscussionView.extend({
    template: templates['discussion-onetoone.html'],
    templateDropdown: templates['dropdown-one-actions.html'],

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

      data.avatar = common.cloudinarySize(data.avatar, 100);
      data.url = '/user/' + ('' + data.username).toLocaleLowerCase();

      data.dropdown = this.templateDropdown({
        data: data
      });

      return data;
    },
    _render: function () {
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
      var url = common.cloudinarySize(value, 100);
      this.$el.find('.header .avatar img').attr('src', url);
    },
    onPoster: function (model, url, options) {
      this.$el.find('div.side').css('background-image', 'url(' + url + ')');
    },
    onLocation: function (model, value, options) {
      this.$el.find('.header .location').html(value);
    },
    onWebsite: function (model, value, options) {
      this.$el.find('.header .website').text(value);
    },
    onStatus: function () {
      if (this.model.get('status') === 'online') {
        this.$el.find('.header .status-block em').text(i18next.t('global.online'));
        this.$el.find('.header .status')
          .removeClass('offline online')
          .addClass('online');
        this.$el.find('.ago').hide();
      } else {
        this.$el.find('.header .status-block em').text(i18next.t('global.offline'));
        this.$el.find('.header .status')
          .removeClass('offline online')
          .addClass('offline');

        var $ago = this.$el.find('.ago span');
        $ago.attr('data-time', this.model.get('onlined'));
        $ago.momentify('fromnow');
        this.$el.find('.ago').show();
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

  return OneToOnePanelView;
});
