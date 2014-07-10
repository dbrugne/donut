define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/user-profile.html'
], function ($, _, Backbone, client, currentUser, userProfileTemplate) {
  var DrawerUserProfileView = Backbone.View.extend({

    template: _.template(userProfileTemplate),

    id: 'user-profile',

    events  : {
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(client, 'user:profile', this.onProfile);

      var that = this;
      this.$el.on('shown', function (e) {
        that.$el.find('.website').linkify();
      });
    },
    /**
     * Set this.$el content and call mainView.popin()
     */
    render: function(user) {
      user.isCurrent = (user.user_id == currentUser.get('user_id'))
        ? true
        : false;

      var html = this.template({user: user});
      this.$el.html(html);

      this.mainView.popin({
        el: this.$el,
        color: user.color
      });

      return this;
    },
    onProfile: function(data) {
      this.render(data.user);
    }

  });

  return DrawerUserProfileView;
});