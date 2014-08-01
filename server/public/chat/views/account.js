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
      'success iframe': 'onSaved' // iframe trigger on '#account-modal iframe',
      // but events listens element "inside" him,
      // not on him, and him == <div id="account-modal"/>
    },

    _initialize: function() {
    },
    onSaved: function(event) {
      this.mainView.alert('info', 'Profile sauvegardé avec succès !');
      this.hide();
    }

  });

  return AccountView;
});