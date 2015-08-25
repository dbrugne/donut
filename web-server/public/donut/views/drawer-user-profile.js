define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, templates) {
  var DrawerUserProfileView = Backbone.View.extend({

    template: templates['drawer-user-profile.html'],

    id: 'user-profile',

    events  : {
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.username = options.username;

      this.listenTo(this.mainView, 'userDeban', this.onUserBanChange);
      this.listenTo(this.mainView, 'userBan',   this.onUserBanChange);

      // show spinner as temp content
      this.render();

      var that = this;
      client.userRead(this.username, function(err, data) {
        if (err === 'unknown') {
          that.mainView.alert('warning', $.t('chat.alert.userprofile', { username: that.username }));
          that.mainView.drawerView._hide();
          return;
        }
        if (!err)
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

      user.avatar = common.cloudinarySize(user.avatar, 90);

      user.url = '/user/' + (''+user.username).toLocaleLowerCase();

      this._rooms(user); // decorate user object with rooms_list

      var html = this.template({user: user});
      this.$el.html(html);
      this.$el.colorify();
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

        room.avatar = common.cloudinarySize(room.avatar, 40);

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
    },

    onUserBanChange: function() {
      this.render();
      client.userRead(this.username, _.bind(function(err, data) {
        if (!err)
          this.onResponse(data);
      }, this));
    }

  });

  return DrawerUserProfileView;
});