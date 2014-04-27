define([
  'jquery',
  'underscore',
  'backbone',
  'collections/discussions',
  'views/main',
  'text!templates/user.html'
], function ($, _, Backbone, discussions, mainView, userTemplate) {
  var UsersView = Backbone.View.extend({

    tagName: 'div',

    template: _.template(userTemplate),

    events: {
      'click .user-profile':      'openProfile',
      'click .user-discussion':   'openOneToOne',
      'dblclick a.user-item':     'openOneToOne',
      'click a.user-item':     'stopPropagation'
    },

    initialize: function(options) {
      this.render();
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    openProfile: function(event) {
      mainView.userProfileModal(this.model.get('id'));
    },

    openOneToOne: function(event) {
      var onetoone = discussions.addOneToOne(this.model);
      discussions.focus(onetoone);

      return false; // stop propagation
    },

    stopPropagation: function(event) {
      // correct bug due to the a.href=#
      return false;
    }

  });

  return UsersView;
});