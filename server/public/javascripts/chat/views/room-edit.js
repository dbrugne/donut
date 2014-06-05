define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/modal'
], function ($, _, Backbone, client, ModalView) {
  var AccountView = ModalView.extend({

    id  : 'room-edit-modal',
    title   : 'Edit The Room',
    url: '/room/edit/toulouse?embed=1',

    events: {
    },

    _initialize: function() {
    }

  });

  return AccountView;
});