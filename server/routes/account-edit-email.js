var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/isloggedin');

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
        var email = req.body.user.fields.email;
        req.user.local.email = email.toLowerCase();
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

module.exports = router;