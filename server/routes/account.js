var express = require('express');
var router = express.Router();

router.route('/')
    .get(isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        var data = {
            success: req.flash('success'),
            info: req.flash('info'),
            warning: req.flash('warning'),
            error: req.flash('error')
        };
        res.render('account', data);
    });

router.route('/edit/email')
    .get(isLoggedIn, function(req, res) {
        // @todo: implement
    })
    .post(isLoggedIn, function(req, res) {
        // @todo: implement
//        req.checkBody(['user', 'fields','email'],'Email should be a valid address.').isEmail();
//        if (req.body.user.fields.email){
//        }
//        req.user.local.email = req.body.user.fields.email;
    });

router.route('/edit/password')
    .get(isLoggedIn, function(req, res) {
        // @todo: implement
    })
    .post(isLoggedIn, function(req, res) {
        // @todo: implement
    });

router.route('/edit/profile')
    .get(isLoggedIn, function(req, res) {
        res.locals.user = req.user;

        var userFields = req.user.toObject();
        res.render('account_edit_profile', {
            userFields: userFields,
            scripts: [{src: '/validator.min.js'}]
        });
    })
    .post(isLoggedIn, function(req, res) {
        req.checkBody(['user', 'fields','username'],'Username should be a string of min 2 and max 25 characters.').matches(/^[-a-z0-9_\\|[\]{}^`]{2,30}$/i);
        req.checkBody(['user', 'fields','bio'],'Bio should be 70 characters max.').isLength(0, 200);
        req.checkBody(['user', 'fields','location'],'Location should be 70 characters max.').isLength(0, 70);
        console.log(req.body);
        if (req.body.user.fields.website){
            req.checkBody(['user', 'fields','website'],'Website should be a valid site URL').isURL();
        }
        // @todo: implement with secure Formidable
        // @todo : test username unicity

        var errors = req.validationErrors();
        if (errors) {
            console.log(errors);
            return res.render('account_edit_profile', {
                userFields: req.body.user.fields,
                is_errors: true,
                errors: errors,
                scripts: [{src: '/validator.min.js'}]
            });
        }

        // @todo : validate, also on client side

        // Sanitize and set
        req.sanitize(['user','fields','username']).escape();
        req.sanitize(['user','fields','bio']).escape();
        req.sanitize(['user','fields','location']).escape();
        req.sanitize(['user','fields','website']).escape();

        // @todo : handle file upload

        // Update user
        req.user.username = req.body.user.fields.username;
        req.user.bio = req.body.user.fields.bio;
        req.user.location = req.body.user.fields.location;
        req.user.website = req.body.user.fields.website;

        // Save
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
                console.log('saved!');
                req.flash('success', 'Your profile was updated');
                res.redirect('/account');
            }
        });
    });

router.get('/delete', isLoggedIn, function(req, res) {
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

// Is authenticated middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

module.exports = router;