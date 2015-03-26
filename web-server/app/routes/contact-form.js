var debug = require('debug')('donut:contact-form');
var express = require('express');
var router = express.Router();
var conf = require('../../../shared/config/index');
var emailer = require('../../../shared/io/emailer');
var https = require('https');

function verifyRecaptcha(key, ip, callback) {
  var url = "https://www.google.com/recaptcha/api/siteverify?secret="+conf.google.recaptcha.secret+"&response="+key+"&remoteip="+ip;
  debug(url);
  https.get(url, function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk.toString();
    });
    res.on('end', function() {
      try {
        var parsedData = JSON.parse(data);
        debug(parsedData);
        callback(parsedData['error-codes'], parsedData.success);
      } catch (e) {
        callback(false);
      }
    });
  });
}

var validateInput = function (req, res, next) {
  req.checkBody('name', 'name').isLength(1, 100);
  req.checkBody('email', 'email').isEmail();
  req.checkBody('message', 'message').isLength(1, 1000);

  if (req.validationErrors())
    return res.send({sent: false});

  // recaptcha
  if (!req.body.recaptcha) {
    debug("Recaptcha field isn't present");
    return res.send({sent: false});
  } else {
    verifyRecaptcha(req.body.recaptcha, req.ip, function(err, success) {
      if (err || !success) {
        debug("Recaptcha error", err);
        return res.send({sent: false});
      }

      debug("Recaptcha field is ok");
      return next();
    });
  }
};

router.route('/contact-form')
  .post([validateInput], function (req, res) {

      var data = {
        name      : req.body.name,
        email     : req.body.email,
        message   : req.body.message,
        ip        : req.ip,
        fqdn      : conf.url
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