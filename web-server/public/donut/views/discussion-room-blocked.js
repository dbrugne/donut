'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'common',
  'models/app',
  'client',
  '_templates'
], function ($, _, Backbone, i18next, common, app, client, templates) {
  var RoomBlockedView = Backbone.View.extend({
    tagName: 'div',

    className: 'discussion',

    hasBeenFocused: false,

    template: templates['discussion-room-blocked.html'],

    events: {},

    initialize: function () {
      this.listenTo(this.model, 'change:focused', this.onFocusChange);
      this.render();
    },
    render: function () {
      var data = this.model.toJSON();

      // owner
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();
      data.isOp = this.model.currentUserIsOp();
      data.isAdmin = this.model.currentUserIsAdmin();

      // avatar
      data.avatar = common.cloudinarySize(data.avatar, 100);

      // id
      data.room_id = this.model.get('id');

      // url
      data.url = this.model.getUrl();

      // render
      var html = this.template(data);
      this.$el.html(html);
      this.$el.hide();

      return this;
    },
    removeView: function () {
      this.remove();
    },
    changeColor: function () {
      if (this.model.get('focused')) {
        app.trigger('changeColor', this.model.get('color'));
      }
    },
    onFocusChange: function () {
      if (this.model.get('focused')) {
        this.$el.show();
        this.hasBeenFocused = true;
      } else {
        this.$el.hide();
      }
    }

  });

  return RoomBlockedView;
});
