define([
  'jquery',
  'underscore',
  'backbone',
  'bootstrap'
], function ($, _, Backbone) {
  var UserProfileView = Backbone.View.extend({

    el: $('#user-profile-modal'),

    events: {
      'hidden.bs.modal': 'teardown'
    },

    show: function(user_id) {
      if (user_id == undefined || user_id == '') {
        return;
      }

      this.$el.modal({
        remote: 'http://' + window.location.hostname + '/u/'+user_id+'?modal=true'
      });
    },

    hide: function() {
      this.$el.modal('hide');
    },

    teardown: function() {
      this.$el.data('modal', null);
      this.remove();
    }

  });

  return new UserProfileView();
});