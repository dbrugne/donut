module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Retrieve current status for user
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.status = function(msg, session, next) {
	if (!msg.uid)
	  return;

	console.log('statusHandler for: '+msg.uid);

	this.app.statusService.getStatusByUid(msg.uid, function(err, result) {
		if (err)
		  console.log('Error while retrieving user status: '+err);

		next(null, {
			result: result
		});
	});
};

handler.statusMulti = function(msg, session, next) {
	if (!msg.uids || !Array.isArray(msg.uids))
		return next(null, {error: 'statusMulti: uids should be an array', code: 500});

	console.log('statusHandler.statusMulti for: ');
	console.log(msg.uids);

	this.app.statusService.getStatusByUids(msg.uids, function(err, result) {
		if (err)
			console.log('Error while retrieving user status: '+err);

		next(null, {
			result: result
		});
	});
};