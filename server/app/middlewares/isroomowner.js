
module.exports = function (req, res, next) {
  var handleError = function(err) {
    console.log(err);
    req.flash('error', err)
    return res.redirect('/');
  }

  if (!req.room) return handleError("Room undefined");
  if (!req.room.owner) return handleError("Room hasn't owner set");

  // Populated
  if (req.room.owner._id) {
    if (req.user._id.toString() == req.room.owner._id.toString()) {
      return next();
    }
  }

  // Not populated
  if (req.user._id.toString() == req.room.owner.toString()) {
    return next();
  }

  return handleError("Room owner not correspond");
};
