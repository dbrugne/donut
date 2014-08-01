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
    url: '', // model /room/edit/toulouse?embed=1

    events: {
      'success iframe': 'onSaved' // iframe trigger on '#room-edit-modal iframe',
                                // but events listens element "inside" him,
                                // not on him, and him == <div id="room-edit-modal"/>
    },
    _initialize: function() {
    },
    setUrl: function(name) {
     if (name[0] == '#') name = name.replace('#', '');
     this.url = '/room/edit/'+name+'?embed=1';
    },
    onSaved: function(event) {
      this.mainView.alert('info', 'Room sauvegardée avec succès !');
      this.hide();
    }

  });

  return AccountView;
});