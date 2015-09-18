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
      'click .ask-for-allowance': 'onRequestAllowance',
      'click .valid-password': 'onValidPassword',
      'click .close-room': 'onCloseRoom'
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
      } else if (data.blocked === 'banned') {
        data.banned_at = 'unable to retrieve';
      }

      // avatar
      data.avatar = common.cloudinarySize(data.avatar, 100);

      // id
      data.room_id = this.model.get('id');

      // dropdown
      data.dropdown = templates['dropdown-room-actions.html']({
        data: data
      });

      // render
      var html = this.template(data);
      this.$el.html(html);
      this.$el.hide();

      this.initializeTooltips();

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
      client.roomJoinRequest(this.model.get('id'), function (response) {
        if (response.err) {
          if (response.err === 'banned' || response.err === 'notallowed') {
            app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
          } else {
            app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        } else {
          app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
        }
      });
    },
    onValidPassword: function (event) {
      var password = $(event.currentTarget).closest('.password-form').find('.input-password').val();
      client.roomJoin(this.model.get('id'), this.model.get('name'), password, function (response) {
        if (response.err && (response.err === 'wrong-password' || response.err === 'spam-password')) {
          $(event.currentTarget).closest('.password-form').find('.error').html($.t('chat.password.' + response.err));
        } else if (response.err) {
          $(event.currentTarget).closest('.password-form').find('.error').html($.t('chat.password.error'));
        }
      });
    },

    onCloseRoom: function (event) {
      event.preventDefault();
      client.roomLeaveBlock(this.model.get('id'));
    },
    initializeTooltips: function () {
      this.$el.find('[data-toggle="tooltip"]').tooltip();
    }

  });

  return RoomBlockedView;
});
