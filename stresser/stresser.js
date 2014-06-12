var mongoose = require('mongoose');
var activity = require('./activity');

//mongoose.set('debug', true);
mongoose.connect('mongodb://localhost:27017/chat');
mongoose.connection.on('error', function() {
  console.log('mongodb error');
  console.log(arguments);
});
mongoose.connection.once('open', function() {

  console.log('mongodb opened - runing intervaller');
  setInterval(activity, 100); // each 250ms we launch our magic

});
