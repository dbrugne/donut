var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/isloggedin');
var cloudinary = require('../app/cloudinary');

var validateInput = function(req, res, next) {
  req.checkBody(['user', 'fields','username'],'Username should be a string of min 2 and max 25 characters.').isUsername();
  req.checkBody(['user', 'fields','bio'],'Bio should be 70 characters max.').isLength(0, 200);
  req.checkBody(['user', 'fields','location'],'Location should be 70 characters max.').isLength(0, 70);

  if (req.body.user.fields.website && '' != req.body.user.fields.website)
    req.checkBody(['user', 'fields','website'],'Website should be a valid site URL').isURL();

  if (req.validationErrors()) {
    return res.render('account_edit_profile', {
      userFields: req.body.user.fields,
      is_errors: true,
      errors: req.validationErrors(),
      scripts: [{src: '/validator.min.js'}]
    });
  }

  return next();
};

var sanitizeInput = function(req, res, next) {
  req.sanitize(['user','fields','bio']).trim();
  req.sanitize(['user','fields','bio']).escape();
  req.sanitize(['user','fields','location']).trim();
  req.sanitize(['user','fields','location']).escape();
  req.sanitize(['user','fields','website']).escape();

  return next();
};

function validateAvailability(req, res, next) {
  var handleError = function (err) {
    return res.render('account_edit_profile', {
      userFields: req.body.user.fields,
      error: err,
      scripts: [
        {src: '/validator.min.js'}
      ]
    });
  };
  req.user.usernameAvailability(
    req.body.user.fields.username, next, handleError);
}

router.route('/account/edit/profile')
  // Form
  .get(isLoggedIn, function(req, res) {
      res.render('account_edit_profile', {
        userFields: req.user.toObject(),
        uploadTag: cloudinary.uploader.image_upload_tag('user[fields][avatar]', {
          callback: "http://" + req.headers.host + "/javascripts/vendor/cloudinary_js/html/cloudinary_cors.html",
          public_id: 'avatar-'+req.user._id,
          tags: "user-avatar",
          crop: "limit", width: 800, height: 600,
          html: { style: "" }
        }),
        scripts: [
          {src: '/javascripts/vendor/validator-js/validator.min.js'},
          {src: '/javascripts/vendor/blueimp-file-upload/js/vendor/jquery.ui.widget.js'},
          {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.iframe-transport.js'},
          {src: '/javascripts/vendor/blueimp-file-upload/js/jquery.fileupload.js'},
          {src: '/javascripts/vendor/cloudinary_js/js/jquery.cloudinary.js'}
        ]
      });
  })
  // Post
  .post(
    [
      isLoggedIn,
      validateInput,
      sanitizeInput,
      validateAvailability
    ],
    function(req, res) {
      var user = req.user;

      // Update user
      user.username = req.body.user.fields.username;
      user.bio = req.body.user.fields.bio;
      user.location = req.body.user.fields.location;
      user.website = req.body.user.fields.website;

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
      }

      // Save
      user.save(function(err) {
        if (err) {
          console.log(err);
          req.flash('error', err)
          return res.redirect('/');
        } else {
          req.flash('success', 'Your profile was updated');
          res.redirect('/account');
        }
      });
  });

module.exports = router;