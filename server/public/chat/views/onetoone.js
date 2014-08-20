define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion',
  'text!templates/onetoone.html'
], function ($, _, Backbone, DiscussionView, oneToOnePanelTemplate) {
  var OneToOnePanelView = DiscussionView.extend({

    template: _.template(oneToOnePanelTemplate),

    _initialize: function() {
      this.listenTo(this.model, 'change:color', this.onColor);
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);
      this.listenTo(this.model, 'change:location', this.onLocation);
      this.listenTo(this.model, 'change:website', this.onWebsite);
      this.listenTo(this.model, 'change:status', this.onStatus);

      this.colorify();
      this.onStatus();
    },
    _remove: function(model) {
    },
    _renderData: function() {
      var data = this.model.toJSON();

      data.avatar = $.c.userAvatar(data.avatar, 'user-large');
      data.poster = $.c.userPoster(data.poster, 'user-poster');

      return data;
    },
    _render: function() {
    },
    _focus: function() {
    },
    _unfocus: function() {
    },

    /**
     * Update user details methods
     */

    onColor: function(model, value, options) {
      this.colorify();
    },
    onAvatar: function(model, value, options) {
      var url = $.c.userAvatar(value, 'user-large');
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, value, options) {
      var url = $.c.userPoster(value, 'user-poster');
      this.$el.find('div.side').css('background-image', 'url('+url+')');
    },
    onLocation: function(model, value, options) {
      this.$el.find('.header .location').text(value);
    },
    onWebsite: function(model, value, options) {
      this.$el.find('.header .website').text(value);
      this.$el.find('.header .website').linkify();
    },
    onStatus: function() {
      if (this.model.get('status')) {
        this.$el.find('.header .status').text('online');
      } else {
        this.$el.find('.header .status').text('offline');
      }
    }

  });

  return OneToOnePanelView;
});