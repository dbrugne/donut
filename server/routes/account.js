var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../app/models/user');

/************************************************/
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart({uploadDir: 'medias/tmp'}); // @todo customize configuration: https://www.npmjs.org/package/multiparty
/************************************************/

router.get('/account', isLoggedIn, function(req, res) {
    req.user.avatarUrl = req.user.avatarUrl();
    res.render('account', {});
});

router.route('/account/edit/email')
    .get(isLoggedIn, function(req, res) {
        var userFields = {email: req.user.local.email}
        res.render('account_edit_email', {
            userFields: userFields,
            scripts: [{src: '/validator.min.js'}]
        });
    })
    .post([
        isLoggedIn,
        function(req, res, next) {
            req.checkBody(['user','fields','email'],'Email should be a valid address.').isEmail();
            if (req.validationErrors()) {
                return res.render('account_edit_email', {
                    userFields: req.body.user.fields,
                    is_errors: true,
                    errors: req.validationErrors(),
                    scripts: [{src: '/validator.min.js'}]
                });
            }

            req.sanitize(['user','fields','email']).escape();
            req.sanitize(['user','fields','email']).toLowerCase(); // to test

            var r = new RegExp('^'+req.body.user.fields.email+'$', 'i');
            User.findOne({
                $and: [
                    {'local.email': {$regex: r}},
                    {_id: { $ne: req.user._id }}
                ]
            }, function(err, user) {
                if (err) {
                    req.flash('error', 'Error while searching existing email: ' + err);
                    return res.redirect('/account');
                }

                if (user) {
                    return res.render('account_edit_email', {
                        userFields: req.body.user.fields,
                        error: 'This email is already used',
                        scripts: [
                            {src: '/validator.min.js'}
                        ]
                    });
                }

                return next();
            });
        }
    ], function(req, res) {
        req.user.local.email = req.body.user.fields.email;
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
                req.flash('success', 'Your email was updated');
                res.redirect('/account');
            }
        });
    });

router.route('/account/edit/password')
    .get(isLoggedIn, function(req, res) {
        res.render('account_edit_password', {
            scripts: [{src: '/validator.min.js'}]
        });
    })
    .post([isLoggedIn, function(req, res, next) {
        req.checkBody(['user','fields','password'],'Passwords don\'t match.').equals(req.body.user.fields.confirm);
        req.checkBody(['user','fields','password'],'Password should be at least 6 characters.').isLength(6, 50);
        if (req.validationErrors()) {
            return res.render('account_edit_password', {
                userFields: req.body.user.fields,
                is_errors: true,
                errors: req.validationErrors(),
                scripts: [{src: '/validator.min.js'}]
            });
        }
        return next();
    }], function(req, res) {
        req.user.local.password = req.user.generateHash(req.body.user.fields.password);
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
                req.flash('success', 'Your account password was updated');
                res.redirect('/account');
            }
        });
    });

router.route('/account/edit/profile/avatar')
  .get(isLoggedIn, function(req, res) {
    res.render('account_edit_profile_avatar', {
      layout: 'layout_light'
    });
  })
  .post([isLoggedIn, multipartMiddleware], function(req, res) {
    var user = req.user;
    var media = req.files.user.fields.avatar;
    user.attach('avatar', media, function(err) {
      if (err) {
        return res.send('error: '+err);
      }
      user.save(function(err) {
        if (err) {
          return res.send('error: '+err);
        } else {
          res.redirect('/account/edit/profile/background');
        }
      });
    });
  });

router.route('/account/edit/profile/background')
  .get(isLoggedIn, function(req, res) {
    res.render('account_edit_profile_background', {
      layout: 'layout_light'
    });
  })
  .post([isLoggedIn, multipartMiddleware], function(req, res) {
    var user = req.user;
    var media = req.files.user.fields.background;
    user.attach('background', media, function(err) {
      if (err) {
        return res.send('error: '+err);
      }
      user.save(function(err) {
        if (err) {
          return res.send('error: '+err);
        } else {
          res.redirect('/account/edit/profile/background');
        }
      });
    });
  });

router.route('/account/edit/profile')
    // Form
    .get(isLoggedIn, function(req, res) {
        var userFields = req.user.toObject();
        res.render('account_edit_profile', {
            userFields: userFields,
            scripts: [{src: '/validator.min.js'}]
        });
    })
    // Post
    .post([
        // User credential
        isLoggedIn,
        // Field validation
        function(req, res, next) {
            req.checkBody(['user', 'fields','username'],'Username should be a string of min 2 and max 25 characters.').matches(/^[-a-z0-9_\\|[\]{}^`]{2,30}$/i);
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

            req.sanitize(['user','fields','username']).escape();
            req.sanitize(['user','fields','bio']).trim();
            req.sanitize(['user','fields','bio']).escape();
            req.sanitize(['user','fields','location']).trim();
            req.sanitize(['user','fields','location']).escape();
            req.sanitize(['user','fields','website']).escape();

            return next();
        },
        // Username validation
        function(req, res, next) {
            var r = new RegExp('^'+req.body.user.fields.username+'$', 'i');
            User.findOne({
                $and: [
                    {username: {$regex: r}},
                    {_id: { $ne: req.user._id }}
                ]
            }, function(err, user) {
                if (err) {
                    req.flash('error', 'Error while searching existing username: ' + err);
                    return res.redirect('/account');
                }

                if (user) {
                    return res.render('account_edit_profile', {
                        userFields: req.body.user.fields,
                        error: 'This username is already taken',
                        scripts: [{src: '/validator.min.js'}]
                    });
                }

                return next();
            });
        }
    ], function(req, res) {
        var user = req.user;

        // Update user
        user.username = req.body.user.fields.username;
        user.bio = req.body.user.fields.bio;
        user.location = req.body.user.fields.location;
        user.website = req.body.user.fields.website;

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

router.get('/account/delete', isLoggedIn, function(req, res) {
    var user = req.user;
    user.remove(function(err) {
        if (err) {
            req.flash('error', err)
            return res.redirect('/');
        }
        req.logout();
        req.flash('success', 'Account successfully deleted');
        res.redirect('/');
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

module.exports = router;