'use strict';
var debug = require('debug')('donut:web');
var express = require('express');
var router = express.Router();

var search = require('../../../shared/util/search');
router.get('/rest/search', function (req, res) {
  search(
    req.query.q,
    false,
    true,
    50,
    false,
    function (err, results) {
      if (err) {
        debug('rest/search error: ' + err);
        res.status(500).send('internal error');
      } else {
        res.status(200).send(results);
      }
    }
  );
});

module.exports = router;
