var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var colors = require('../../../shared/config/colors');

router.get('/!', function(req, res) {

  // Is user authenticated
  if (!req.isAuthenticated()) {
    // set Flash message (display on profile page or landing page depending
    // requested URL hash)
    req.flash('warning', i18next.t("chat.shouldauthenticated"));

    // render an HTML DOM that redirect browser on corresponding profile page
    return res.render('chat_track_anchor', {
      layout: false,
      partials: {head: '_head'},
      meta: {title: i18next.t("title.chat")},
      colors: colors.toString()
    });
  }

  // Has user a username
  if (!req.user.username) {
    return res.redirect('/choose-username');
  }

  // ... otherwise open chat

  bouncer.reset(req); // cleanup bouncer (not before cause other middleware can redirect
                      // browser before, e.g.: choose-username)

  // donut build to load
  var build = '/donut/index.js'; // default to source
  if (!req.isDebug()) { // not in debug mode, try to find last build
    try {
      var last = require('../../public/build/last'); // /!\ reloaded on server restart only
      if (last.build)
        build = '/build/'+last.build;
    } catch (e) {
      console.log('Error while reading last.json file to determine build to load: '+e);
    }
  }

  return res.render('chat', {
    layout: false,
    partials: {head: '_head', contactform: '_contact'},
    meta: {title: i18next.t("title.chat")},
    colors: colors.toString(),
    build: build
  });

});

module.exports = router;