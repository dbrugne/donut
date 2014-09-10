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

      data.avatar = $.cd.userAvatar(data.avatar, 100, data.color);
      data.poster = $.cd.poster(data.poster, data.color);

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
      this.onPoster(model, model.get('poster'), options);
    },
    onAvatar: function(model, value, options) {
      var url = $.cd.userAvatar(value, 100, model.get('color'));
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, value, options) {
      var url = $.cd.poster(value, model.get('color'));
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