var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var conf = require('../../../config/index');

router.get('/create-a-room', function(req, res) {

  var meta = {
    title         : i18next.t("title.create-a-room"),
    description   : i18next.t("title.create-a-room"),
    ogtitle       : i18next.t("title.create-a-room"),
    ogdescription : i18next.t("title.create-a-room"),
    oglocale      : i18next.t("meta.locale"),
    ogalternate   : i18next.t("meta.alternate"),
    image         : i18next.t("title.create-a-room"),
    type          : 'object'
  };

  res.render('create-a-room', {
    meta: meta
  });
});

module.exports = router;