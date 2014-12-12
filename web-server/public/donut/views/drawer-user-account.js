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
      var that = this;
      client.userRead(currentUser.get('username'), function(data) {
        that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onResponse: function(user) {
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