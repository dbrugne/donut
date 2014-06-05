define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/modal'
], function ($, _, Backbone, client, ModalView) {
  var AccountView = ModalView.extend({

    id  : 'account-modal',
    title   : 'Your Account',
    url: '/account/edit/profile?embed=1',

    events: {
    },

    _initialize: function() {
    }

  });

  return AccountView;
});