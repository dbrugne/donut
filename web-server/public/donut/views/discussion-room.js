define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  'views/discussion',
  'views/room-topic',
  'views/room-users',
  '_templates'
], function ($, _, Backbone, client, currentUser, confirmationView, DiscussionView, TopicView, UsersView, templates) {
  var RoomView = DiscussionView.extend({

    template: templates['discussion-room.html'],

    events: {
      'click .op-user'            : 'opUser',
      'click .deop-user'          : 'deopUser',
      'click .kick-user'          : 'kickUser',
      'click .ban-user'           : 'banUser',
      'click .voice-user'         : 'voiceUser',
      'click .devoice-user'       : 'devoiceUser',
      'click .share .facebook'    : 'shareFacebook',
      'click .share .twitter'     : 'shareTwitter',
      'click .share .googleplus'  : 'shareGoogle'
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);
      this.listenTo(this.model, 'change:color', this.onColor);

      this.topicView = new TopicView({el: this.$el.find('.topic'), model: this.model});
      this.usersView = new UsersView({el: this.$el.find('.side .users'), model: this.model, collection: this.model.users});

      // color
      this.colorify();
    },
    _remove: function(model) {
      this.stopListening();
      this.topicView._remove();
      this.usersView._remove();
    },
    _renderData: function() {
      var data = this.model.toJSON();

      // owner
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();
      data.isOp    = this.model.currentUserIsOp();
      data.isAdmin = this.model.currentUserIsAdmin();

      // avatar
      data.avatar = $.cd.roomAvatar(data.avatar, 100);

      // poster
      var posterPath = data.poster;
      data.poster = $.cd.poster(posterPath);
      data.posterblured = $.cd.posterBlured(posterPath);

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
    _firstFocus: function() {
      this.model.fetchUsers();
    },

    /**
     * User actions methods
     */

    opUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('name'), username);
      });
    },
    deopUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('name'), username);
      });
    },
    kickUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomKick(that.model.get('name'), username, reason);
      });
    },
    banUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomBan(that.model.get('name'), username, reason);
      });
    },
    voiceUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() &&!this.model.currentUserIsAdmin())
        return false;
      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      client.roomVoice(this.model.get('name'), username);
    },
    devoiceUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      client.roomDevoice(this.model.get('name'), username);
    },

    /**
     * Update room details methods
     */

    onColor: function(model, value, options) {
      this.onAvatar(model, model.get('avatar'), options);
      this.onPoster(model, model.get('poster'), options);
      this.colorify();
    },
    onAvatar: function(model, value, options) {
      var url = $.cd.roomAvatar(value, 100);
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, value, options) {
      var url = $.cd.poster(value);
      this.$el.find('div.side').css('background-image', 'url('+url+')');
      var urlb = $.cd.posterBlured(value);
      this.$el.find('div.blur').css('background-image', 'url('+urlb+')');
    },

    /**
     * Social sharing
     */
    shareFacebook: function() {
      $.socialify.facebook({
        url         : this.model.getUrl(),
        name        : $.t('chat.share.title', { name: this.model.get('name') }),
        picture     : $.cd.roomAvatar(this.model.get('avatar'), 350),
        description : $.t('chat.share.description', { name: this.model.get('name') })
      });
    },
    shareTwitter: function() {
      $.socialify.twitter({
        url  :  this.model.getUrl(),
        text : $.t('chat.share.description', { name: this.model.get('name') })
      });
    },
    shareGoogle: function() {
      $.socialify.google({
        url: this.model.getUrl()
      });
    }

  });

  return RoomView;
});