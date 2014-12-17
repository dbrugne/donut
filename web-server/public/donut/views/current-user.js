define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/current-user.html'
], function ($, _, Backbone, client, currentUser, currentUserTemplate) {
  var CurrentUserView = Backbone.View.extend({

    template: _.template(currentUserTemplate),

    el: $('#block-current-user'),

    hello: '',

    events: {
      'click .mute': 'onMute',
      'click .unmute': 'onUnmute'
    },

    initialize: function(options) {
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      if (!currentUser.get('user_id'))
        return this; // nothing to render if welcome isn't received

      var data = currentUser.toJSON();

      var tpl = new String('<span class="username open-user-profile" data-username="%username">%username</span>');
      tpl = tpl.replace(/%username/g, currentUser.get('username'))
      data.hello = this.hello.replace('%u', '@'+tpl);

      data.avatar = $.cd.userAvatar(currentUser.get('avatar'), 60);
      data.mute = currentUser.mute;

      var html = this.template(data);
      this.$el.html(html);
      return this;
    },
    onMute: function(event) {
      currentUser.setMute(true);
      this.render();
    },
    onUnmute: function(event) {
      currentUser.setMute(false);
      this.render();
    }

  });

  return CurrentUserView;
});
