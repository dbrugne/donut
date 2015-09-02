define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'libs/donut-debug',
  'client',
  '_templates'
], function ($, _, Backbone, common, donutDebug, client, templates) {

  var debug = donutDebug('donut:modal-welcome');

  var WelcomeModalView = Backbone.View.extend({

    el: $('#welcome'),

    template: templates['rooms-cards.html'],

    events: {
      'hidden.bs.modal': 'onHide',
      'click .nothing, .list .room .join': 'onClose'
    },

    callback: null,

    initialize: function (options) {
      this.$el.modal({
        show: false
      });
    },
    render: function (welcome) {
      if (!welcome || !welcome.featured || !welcome.featured.length) {
        this.$el.find('.modal-body .rooms').empty();
        return;
      }

      var rooms = [];
      _.each(welcome.featured, function (room) {
        room.avatar = common.cloudinarySize(room.avatar, 135);
        rooms.push(room);
      });

      var html = this.template({
        title: false,
        rooms: welcome.featured
      });
      this.$el.find('.modal-body .rooms')
        .html(html);
      return this;
    },
    show: function () {
      this.$el.modal('show');
    },
    hide: function () {
      this.$el.modal('hide');
    },
    onHide: function () {
      // set welcome as false on user if checkbox is checked
      if (this.$el.find("input[type='checkbox'].avoid").prop('checked') === true) {
        client.userPreferencesUpdate({'browser:welcome': false}, function (data) {
          debug('user preference saved: ', data);
        });
      }
    },
    onClose: function (event) {
      this.hide();
    }

  });

  return WelcomeModalView;
});
