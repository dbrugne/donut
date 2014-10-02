define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/discussion',
  'views/room-topic',
  'views/room-users',
  'text!templates/room.html'
], function ($, _, Backbone, client, currentUser, DiscussionView, TopicView, UsersView, roomTemplate) {
  var RoomView = DiscussionView.extend({

    template: _.template(roomTemplate),

    events: {
      'click .op-user': 'opUser',
      'click .deop-user': 'deopUser',
      'click .kick-user': 'kickUser'
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:color', this.onColor);
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);

      this.topicView = new TopicView({el: this.$el.find('.topic'), model: this.model});
      this.usersView = new UsersView({el: this.$el.find('.users'), model: this.model, collection: this.model.users});

      // color
      this.colorify();

      // run only when the DOM is ready (0ms timeout)
      var that = this;
      setTimeout(function() {
        // share button
        new Share(that.share.selector, {
          url: that.model.getUrl(),
          ui: {
            flyout: 'bottom right',
            button_text: $.t('chat.share.inviteyourfriends')
          },
          networks: {
            facebook: {
              app_id: window.facebook_app_id,
              load_sdk: false
            },
            twitter: {
              title: $.t('chat.share.title', {name: that.model.get('name')}),
              description: $.t('chat.share.description', {name: that.model.get('name')})
            },
            email: {
              title: $.t('chat.share.email.subject', {name: that.model.get('name')}),
              description: $.t('chat.share.email.message', {name: that.model.get('name')})
            },
            pinterest: {
              enabled: false
            }
          }
        });

      }, 0);
    },
    _remove: function(model) {
      this.topicView.remove();
      this.usersView.remove();
    },
    _renderData: function() {
      var data = this.model.toJSON();

      // owner
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();

      // avatar
      data.avatar = $.cd.roomAvatar(data.avatar, 100, data.color);

      // poster
      var posterPath = data.poster;
      data.poster = $.cd.poster(posterPath, data.color);
      data.posterblured = $.cd.posterBlured(posterPath, data.color);

      // url
      data.url = this.model.getUrl();

      // share widget
      var share = 'share-room-'
        + this.model.get('name').replace('#', '').toLocaleLowerCase()
      this.share = {
        class: share,
        selector: '.'+share
      }
      data.share = this.share.class;

      return data;
    },
    _render: function() {
    },
    _focus: function() {
    },
    _unfocus: function() {
    },

    /**
     * User actions methods
     */

    opUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomOp(this.model.get('name'), username);
    },
    deopUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomDeop(this.model.get('name'), username);
    },
    kickUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomKick(this.model.get('name'), username);
    },

    /**
     * Update room details methods
     */

    onColor: function(model, value, options) {
      this.colorify();
      this.onAvatar(model, model.get('avatar'), options);
      this.onPoster(model, model.get('poster'), options);
    },
    onAvatar: function(model, value, options) {
      var url = $.cd.roomAvatar(value, 100, model.get('color'));
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, value, options) {
      var url = $.cd.poster(value, model.get('color'));
      this.$el.find('div.side').css('background-image', 'url('+url+')');
      var urlb = $.cd.posterBlured(value, model.get('color'));
      this.$el.find('div.blur').css('background-image', 'url('+urlb+')');
    }

  });

  return RoomView;
});