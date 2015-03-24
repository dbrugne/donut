var debug = require('debug')('donut:contact-form');
var express = require('express');
var router = express.Router();
var emailer = require('../../../shared/io/emailer');

var validateInput = function (req, res, next) {
  req.checkBody('name', 'name').isLength(1, 100);
  req.checkBody('email', 'email').isEmail();
  req.checkBody('message', 'message').isLength(1, 1000);

  if (req.validationErrors())
    return res.send({sent: false});

  next();
};

router.route('/contact-form')
  .post([validateInput], function (req, res) {

      var data = {
        name      : req.body.name,
        email     : req.body.email,
        message   : req.body.message,
        ip        : req.ip,
        fqdn      : req.protocol + '://' + req.hostname
      };

      if (req.user) {
        if (req.user.username)
          data.user = req.user.username;
        else
          data.user = req.user._id.toString();
      }

      emailer.contactForm(data, function(err) {
        if (err) {
          debug('Unable to contact form: '+err);
          return res.send({sent: false});
        }

        res.send({sent: true});
      });
  });

module.exports = router;