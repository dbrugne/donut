define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  'views/discussion',
  'views/room-topic',
  'views/room-users',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, confirmationView, DiscussionView, TopicView, UsersView, templates) {
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
      this.listenTo(this.model, 'change:posterblured', this.onPosterBlured);
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
      data.avatar = common.cloudinarySize(data.avatar, 100);

      // id
      data.room_id = this.model.get('id');

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

    _showUserListModal: function() {
      if (this.topicView.isUserModelRequired()) {
        this.topicView.loadUserModal();
      }
    },

    opUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('id'), userId, null);
      });
    },
    deopUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('id'), userId, null);
      });
    },
    kickUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomKick(that.model.get('id'), userId, reason);
      });
    },
    banUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomBan(that.model.get('id'), userId, reason);
      });
    },
    voiceUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() &&!this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      client.roomVoice(this.model.get('id'), userId, null);
    },
    devoiceUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomDevoice(that.model.get('id'), userId, null, reason);
      });
    },

    /**
     * Update room details methods
     */

    onColor: function(model, value, options) {
      this.onAvatar(model, model.get('avatar'), options);
      this.onPoster(model, model.get('poster'), options);
      this.onPosterBlured(model, model.get('posterblured'), options);
      this.colorify();
    },
    onAvatar: function(model, value, options) {
      var url = common.cloudinarySize(value, 100);
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, url, options) {
      this.$el.find('div.side').css('background-image', 'url('+url+')');
    },
    onPosterBlured: function(model, url, options) {
      this.$el.find('div.blur').css('background-image', 'url('+url+')');
    },

    /**
     * Social sharing
     */
    shareFacebook: function() {
      $.socialify.facebook({
        url         : this.model.getUrl(),
        name        : $.t('chat.share.title', { name: this.model.get('name') }),
        picture     : common.cloudinarySize(this.model.get('avatar'), 350),
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