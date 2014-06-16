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
    },
    _initialize: function() {
    },
    setUrl: function(name) {
     if (name[0] == '#') name = name.replace('#', '');
     this.url = '/room/edit/'+name+'?embed=1';
    }

  });

  return AccountView;
});