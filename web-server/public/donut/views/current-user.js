'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, common, currentUser, templates) {
  var CurrentUserView = Backbone.View.extend({
    el: $('#block-current-user'),

    template: templates['current-user.html'],

    initialize: function (options) {
      this.listenTo(this.model, 'change', this.render);
    },
    render: function () {
      if (!currentUser.get('user_id'))
        return this; // nothing to render if welcome wasn't received

      var data = currentUser.toJSON();

      data.avatar = common.cloudinarySize(currentUser.get('avatar'), 60);

      var html = this.template(data);
      this.$el.html(html);
      return this;
    }

  });

  return CurrentUserView;
});
