var helper = require('./helper');
var User = require('../models/user');

var _ = require('underscore');
var Activity = require('../models/activity');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, retrieveHistory, helper.handleError);

  function retrieveHistory(userWith) {
    // All user:message between userWith and socket.getUserId() (both direction)
    Activity.find({
      type: 'user:message',
      $or: [
        {$and: [{user_id: socket.getUserId()}, {'data.to_user_id': userWith._id.toString()}]},
        {$and: [{user_id: userWith._id.toString()}, {'data.to_user_id': socket.getUserId()}]}
      ]
    })
    .sort({time: -1})
    .limit(10)
    .exec(function(err, messages) {
      if (err) return helper.handleError(err);
      handleSuccess(userWith, messages);
    });
  }

  function handleSuccess(userWith, messages) {
    // Push user data to all user devices
    messages = _.map(messages, function(o) {
      var m = o.toJSON();
      return o.data;
    });
    messages.reverse();
    io.sockets.in('user:'+socket.getUserId()).emit('user:open', {
      user_id: userWith._id,
      username: userWith.username,
      avatar: userWith.avatarUrl(),
      history: messages
    });

    // Activity
    helper.record('user:open', socket, data);
  }

};
