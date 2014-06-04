var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/middlewares/isloggedin');
var isRoomOwner = require('../app/middlewares/isroomowner')
var cloudinary = require('../app/cloudinary');
var sanitize = require('sanitize-caja');

var paramHandler = require('../app/middlewares/room-param');
router.param('room', paramHandler);

var renderForm = function(req, res) {
  var options = {
    uploadTag: cloudinary.uploader.image_upload_tag('room[fields][avatar]', {
      callback: "http://" + req.headers.host + "/javascripts/vendor/cloudinary_js/html/cloudinary_cors.html",
      public_id: 'avatar-'+req.room._id,
      tags: "room-avatar",
      crop: "limit", width: 800, height: 600,
      html: { style: "" }
    }),
    scripts: [
      {src: '/javascripts/vendor/validator-js/validator.min.js'},
      {src: '/javascripts/vendor/colpick/js/colpick.js'},
      {src: '/javascripts/plugins/jquery.maxlength.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/vendor/jquery.ui.widget.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.iframe-transport.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.fileupload.js'},
      {src: '/javascripts/vendor/cloudinary_js/js/jquery.cloudinary.js'}
    ]
  };

  if (req.body.fields) {
    options.roomFields = req.body.room.fields;
  } else {
    options.roomFields = req.room.toObject();
  }

  if (options.roomFields.color) {
    options.roomFields.color = options.roomFields.color.replace('#', '');
  }

  options.action = '/room/edit/'+req.room.name.replace('#', '');

  if (req.query.embed == '1') {
    options.layout = "layout_light";
    options.action += '?embed=1';
  }

  if (req.validationErrors()) {
    options.is_errors = true;
    options.errors = req.validationErrors();
  }

  return res.render('room_edit', options);
};

var validateInput = function(req, res, next) {
  req.checkBody(['room', 'fields','description'],'Description should be 200 characters max.').isLength(0, 200);

  if (req.body.room.fields.color && '' != req.body.room.fields.color)
    req.checkBody(['room', 'fields','color'], 'Color should be explained has hexadecimal (e.g.: #FF00AA).').isHexColor();

  if (req.body.room.fields.website && '' != req.body.room.fields.website)
    req.checkBody(['room', 'fields','website'],'Website should be a valid site URL').isURL();

  if (req.validationErrors()) {
    return renderForm(req, res);
  }

  return next();
};

var sanitizeInput = function(req, res, next) {
  req.sanitize(['room','fields','description']).trim();
  req.body.room.fields.description = sanitize(req.body.room.fields.description);
  req.sanitize(['room','fields','description']).escape();

  req.sanitize(['room','fields','website']).trim();
  req.sanitize(['room','fields','website']).escape();

  return next();
};

router.route('/room/edit/:room')
  // Form
  .get([isLoggedIn, isRoomOwner], renderForm)
  // Post
  .post(
    [isLoggedIn, isRoomOwner, validateInput, sanitizeInput],
    function(req, res) {
      var room = req.room;

      // Update room
      room.description = req.body.room.fields.description;
      room.website = req.body.room.fields.website;
      if (req.body.room.fields.color) {
        room.color = '#'+req.body.room.fields.color;
      } else {
        room.color = '';
      }

      // Cloudinary image
      if (req.body.room.fields.avatar) {
        var preloaded_file = new cloudinary.PreloadedFile(req.body.room.fields.avatar);
        if (preloaded_file.is_valid()) {
          room.avatar = preloaded_file.identifier();
          // just to know that a avatar exist on cloudinary,
          // we use the room '_id' in code to find avatar
        } else {
          throw("Invalid upload signature");
        }
      } else if (req.body.room.fields.avatardelete == 'true') {
        if (req.room.avatar) { // asynchronous
          cloudinary.api.delete_resources([req.room.avatarId()],
            function(result){ console.log(result.deleted); });
        }
        room.avatar = '';
      };

      // Save
      room.save(function(err) {
        var destination = '/room/edit/'+room.name.replace('#', '');
        if (req.query.embed == '1') destination += '?embed=1';
        if (err) {
          console.log(err);
          req.flash('error', err)
          return res.redirect(destination);
        } else {
          req.flash('success', 'Your profile was updated');
          res.redirect(destination);
        }
      });
  });

module.exports = router;