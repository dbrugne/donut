define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, currentUser, templates) {
  var DrawerUserEditView = Backbone.View.extend({

    template: templates['drawer-user-account.html'],

    id: 'user-account',

    events  : {},

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userRead(currentUser.get('username'), function(err, data) {
        if (!err)
          that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
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