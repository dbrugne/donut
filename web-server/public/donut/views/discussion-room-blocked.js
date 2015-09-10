'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'moment',
  'common',
  'models/app',
  'client',
  '_templates'
], function ($, _, Backbone, i18next, moment, common, app, client, templates) {
  var RoomBlockedView = Backbone.View.extend({
    tagName: 'div',

    /**
     * @todo : close discussion view in left tab
     * @todo : reopen on next welcome (how to persist?)
     */

    className: 'discussion',

    hasBeenFocused: false,

    template: templates['discussion-room-blocked.html'],

    events: {
      'click .ask-for-allowance': 'onRequestAllowance'
    },

    initialize: function () {
      this.listenTo(this.model, 'change:focused', this.onFocusChange);
      this.render();
    },
    render: function () {
      var data = this.model.toJSON();

      // owner
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;

      // banned_at
      if (data.banned_at) {
        data.banned_at = moment(data.banned_at).format('dddd Do MMMM YYYY');
      }

      // avatar
      data.avatar = common.cloudinarySize(data.avatar, 100);

      // id
      data.room_id = this.model.get('id');

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
    },
    onRequestAllowance: function () {
      client.roomRequestAllowance(this.model.get('id'), function (response) {
        if (response.err) {
          if (response.err === 'banned' || response.err === 'allowed') {
            app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
          } else {
            app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        } else {
          app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
        }
      });
    }

  });

  return RoomBlockedView;
});
