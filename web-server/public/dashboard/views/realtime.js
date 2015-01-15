define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/realtime.html'
], function ($, _, Backbone, client, htmlTemplate) {

  //client.connect('browser-' + Date.now(), 'chat.local', 3015, function(err){ // nginx 3015 => 3005
  //  if(err) {
  //    console.error('fail to connect to admin console server:');
  //    console.error(err);
  //  } else {
  //    console.info('admin console connected.');
  //  }
  //});

  // console usage exemple in /dashboard#realtime
  //client.request('monitorLog', {number:200,logfile:'pomelo',serverId:'connector-server-1'} , function(err, msg) {
  //  if(err) {
  //    console.error('fail to request monitorLog info:');
  //    console.error(err);
  //    return;
  //  }
  //  console.log(msg);
  //});

  var RealtimeView = Backbone.View.extend({

    id: 'realtime',

    template: _.template(htmlTemplate),

    initialize: function() {
      this.render();
    },
    render: function() {
      var html = this.template({});
      this.$el.html(html);
      return this;
    }
  });

  return RealtimeView;
});