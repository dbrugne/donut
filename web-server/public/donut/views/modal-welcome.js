define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  '_templates'
], function ($, _, Backbone, client, templates) {
  var WelcomeModalView = Backbone.View.extend({

    el: $('#welcome'),

    template: templates['welcome.html'],

    events: {
      "hidden.bs.modal"                     : "onHide",
      "click .nothing, .list .room .join" : "onClose"
    },

    callback: null,

    initialize: function(options) {
      this.$el.modal({
        show: false
      });
    },
    render: function(welcome) {
      if (!welcome || !welcome.featured || !welcome.featured.length) {
        this.$el.find('.modal-body .rooms').empty();
        return;
      }

      var rooms = [];
      _.each(welcome.featured, function(room) {
        room.avatar = $.cd.roomAvatar(room.avatar, 135);
        rooms.push(room);
      });

      var html = this.template({rooms: welcome.featured});
      this.$el.find('.modal-body .rooms')
          .html(html)
          .colorify();
      return this;
    },
    show: function() {
      this.$el.modal('show');
    },
    hide: function() {
      this.$el.modal('hide');
    },
    onHide: function() {
      // set welcome as false on user if checkbox is checked
      if (this.$el.find(".checkbox input[type='checkbox']").prop('checked') === true) {
        client.userUpdate({welcome: false}, function(data) { window.debug.log('user preference saved: ', data); });
      }
    },
    onClose: function(event) {
      this.hide();
    }

  });

  return new WelcomeModalView();
});
