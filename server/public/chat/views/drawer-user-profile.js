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

      var html = this.template({user: user});
      this.$el.html(html);
      this.$el.colorify();
      this.$el.find('.website').linkify();

      if (user.color)
        this.trigger('color', user.color);
    }

  });

  return DrawerUserProfileView;
});