var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/middlewares/isloggedin');
var cloudinary = require('../app/cloudinary');
var sanitize = require('sanitize-caja');

var renderForm = function(req, res) {
  var options = {
    uploadTag: cloudinary.uploader.image_upload_tag('user[fields][avatar]', {
      callback: "http://" + req.headers.host + "/javascripts/vendor/cloudinary_js/html/cloudinary_cors.html",
      public_id: 'avatar-'+req.user._id,
      tags: "user-avatar",
      crop: "limit", width: 800, height: 600,
      html: { style: "" }
    }),
    scripts: [
      {src: '/javascripts/vendor/validator-js/validator.min.js'},
      {src: '/javascripts/vendor/colpick/js/colpick.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/vendor/jquery.ui.widget.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.iframe-transport.js'},
      {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.fileupload.js'},
      {src: '/javascripts/vendor/cloudinary_js/js/jquery.cloudinary.js'}
    ]
  };

  if (req.body.fields) {
    options.userFields = req.body.user.fields;
  } else {
    options.userFields = req.user.toObject();
  }

  if (options.userFields.color) {
    options.userFields.color = options.userFields.color.replace('#', '');
  }

  options.action = '/account/edit/profile';

  if (req.query.embed == '1') {
    options.layout = "layout_light";
    options.action += '?embed=1';
  }

  if (req.validationErrors()) {
    options.is_errors = true;
    options.errors = req.validationErrors();
  }

  return res.render('account_edit_profile', options);
};

var validateInput = function(req, res, next) {
  req.checkBody(['user', 'fields','bio'],'Bio should be 200 characters max.').isLength(0, 200);
  req.checkBody(['user', 'fields','location'],'Location should be 70 characters max.').isLength(0, 70);

  if (req.body.user.fields.color && '' != req.body.user.fields.color)
    req.checkBody(['user', 'fields','color'],'Color should be explained has hexadecimal (e.g.: #FF00AA).').isHexColor();

  if (req.body.user.fields.website && '' != req.body.user.fields.website)
    req.checkBody(['user', 'fields','website'],'Website should be a valid site URL').isURL();

  if (req.validationErrors()) {
    return renderForm(req, res);
  }

  return next();
};

var sanitizeInput = function(req, res, next) {
  req.sanitize(['user','fields','bio']).trim();
  req.body.user.fields.bio = sanitize(req.body.user.fields.bio);
  req.sanitize(['user','fields','bio']).escape();

  req.sanitize(['user','fields','location']).trim();
  req.body.user.fields.location = sanitize(req.body.user.fields.location);
  req.sanitize(['user','fields','location']).escape();

  req.sanitize(['user','fields','website']).trim();
  req.sanitize(['user','fields','website']).escape();

  return next();
};

router.route('/account/edit/profile')
  // Form
  .get(isLoggedIn, renderForm)
  // Post
  .post(
    [isLoggedIn,validateInput,sanitizeInput],
    function(req, res) {
      var user = req.user;

      // Update user
      user.bio = req.body.user.fields.bio;
      user.location = req.body.user.fields.location;
      user.website = req.body.user.fields.website;
      if (req.body.user.fields.color) {
        user.color = '#'+req.body.user.fields.color;
      } else {
        user.color = '';
      }

      // Cloudinary image
      if (req.body.user.fields.avatar) {
        var preloaded_file = new cloudinary.PreloadedFile(req.body.user.fields.avatar);
        if (preloaded_file.is_valid()) {
          user.avatar = preloaded_file.identifier();
          // just to know that a avatar exist on cloudinary,
          // we use the user '_id' in code to find avatar
        } else {
          throw("Invalid upload signature");
        }
      } else if (req.body.user.fields.avatardelete == 'true') {
        if (req.user.avatar) { // asynchronous
          cloudinary.api.delete_resources([req.user.avatarId()],
            function(result){ console.log(result.deleted); });
        }
        user.avatar = '';
      };

      // Save
      user.save(function(err) {
        if (err) {
          console.log(err);
          req.flash('error', err)
          return res.redirect('/');
        } else {
          req.flash('success', 'Your profile was updated');
          var destination = '/account/edit/profile';
          if (req.query.embed == '1') destination += '?embed=1';
          res.redirect(destination);
        }
      });
  });

module.exports = router;