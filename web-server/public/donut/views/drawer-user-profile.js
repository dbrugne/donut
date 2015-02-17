define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, currentUser, templates) {
  var DrawerUserProfileView = Backbone.View.extend({

    template: templates['user-profile.html'],

    id: 'user-profile',

    events  : {
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.username = options.username;

      // show spinner as temp content
      this.render();

      var that = this;
      client.userRead(this.username, function(data) {
        that.onResponse(data);
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function (user) {
      user.isCurrent = (user.user_id == currentUser.get('user_id'))
        ? true
        : false;

      user.avatar = $.cd.userAvatar(user.avatar, 90);

      user.url = '/user/' + (''+user.username).toLocaleLowerCase();

      this._rooms(user); // decorate user object with rooms_list

      var html = this.template({user: user});
      this.$el.html(html);
      this.$el.colorify();
      this.$el.find('.website span').linkify();
      this.$el.find('.created span').momentify('date');
      this.$el.find('.onlined span').momentify('fromnow');

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

        room.avatar = $.cd.roomAvatar(room.avatar, 40);

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