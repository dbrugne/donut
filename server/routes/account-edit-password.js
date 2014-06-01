var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/middlewares/isloggedin');

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

module.exports = router;