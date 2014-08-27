define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/user-account.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, userAccountTemplate, spinnerTemplate) {
  var DrawerUserEditView = Backbone.View.extend({

    template: _.template(userAccountTemplate),

    id: 'user-account',

    events  : {},

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      client.userRead();

      // on response show form
      this.listenTo(client, 'user:read', this.onRead);
    },
    render: function() {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onRead: function(user) {
      // colorize drawer .opacity
      if (user.color)
        this.trigger('color', user.color);

      var html = this.template({user: user});
      this.$el.html(html);

      // color form
      this.$el.find('.user').colorify();
    }

  });

  return DrawerUserEditView;
});