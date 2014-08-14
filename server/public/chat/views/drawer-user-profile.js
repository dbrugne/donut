define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/user-profile.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, userProfileTemplate, spinnerTemplate) {
  var DrawerUserProfileView = Backbone.View.extend({

    template: _.template(userProfileTemplate),

    id: 'user-profile',

    events  : {
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.userId = options.userId;

    // show spinner as temp content
    this.render();

    // ask for data
    client.userProfile(this.userId);

    // on response show profile
    this.listenTo(client, 'user:profile', this.onProfile);
    },
    render: function () {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onProfile: function (data) {
      var user = data.user;
      user.isCurrent = (user.user_id == currentUser.get('user_id'))
        ? true
        : false;

      user.avatar = $.c.userAvatar(user.avatar, 'user-large');

      this._rooms(user); // decorate user object with rooms_list
      console.log(user.rooms_list);

      var html = this.template({user: user});
      this.$el.html(html);
      this.$el.colorify();
      this.$el.find('.website').linkify();

      if (user.color)
        this.trigger('color', user.color);
    },
    /**
     * Construct the user room list for profile displaying
     * For each set name, avatar and color
     * @param user
     * @private
     */
    _rooms: function (user) {
      user.rooms_list = [];

      if (!user.rooms)
        return;

      var alreadyIn = [];
      function pushNew(room, owned, oped) {
        if (!room.name)
          return;

        if (alreadyIn.indexOf(room.name) !== -1)
          return;
        else
          alreadyIn.push(room.name);

        if (owned === true)
          room.owned = true;

        if (oped === true)
          room.oped = true;

        room.avatar = $.c.roomAvatar(room.avatar, 'room-medium');

        user.rooms_list.push(room);
      }

      if (user.rooms.owned && user.rooms.owned.length > 0) {
        _.each(user.rooms.owned, function(room) {
          pushNew(room, true, false);
        });
      }

      if (user.rooms.oped && user.rooms.oped.length > 0) {
        _.each(user.rooms.oped, function(room) {
          pushNew(room, false, true);
        });
      }

      if (user.rooms.joined && user.rooms.joined.length > 0) {
        _.each(user.rooms.joined, function(room) {
          pushNew(room, false, false);
        });
      }
    }

  });

  return DrawerUserProfileView;
});