//var chatRemote = require('../remote/chatRemote');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.send = function(msg, session, next) {
	console.log('roomMessageHandler');
	console.log(msg);

	this.app.globalChannelService.pushMessage('connector', 'room:message', msg.message, msg.name, {}, function(err) {
		if (err)
		  return console.log('Error while pushing message: '+err);
	});

//var rid = session.get('rid');
	//var username = session.uid.split('*')[0];
	//var channelService = this.app.get('channelService');
	//var param = {
	//	msg: msg.content,
	//	from: username,
	//	target: msg.target
	//};
	//channel = channelService.getChannel(rid, false);
  //
	////the target is all users
	//if(msg.target == '*') {
	//	channel.pushMessage('onChat', param);
	//}
	////the target is specific user
	//else {
	//	var tuid = msg.target + '*' + rid;
	//	var tsid = channel.getMember(tuid)['sid'];
	//	channelService.pushMessageByUids('onChat', param, [{
	//		uid: tuid,
	//		sid: tsid
	//	}]);
	//}
	next(null, {
		result: 'ok josé'
	});
};