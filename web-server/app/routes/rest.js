'use strict';
var debug = require('debug')('donut:web');
var express = require('express');
var router = express.Router();

var search = require('../../../shared/util/search');
router.get('/rest/search', function (req, res) {
  search(
    req.query.q,            // querry
    false,                  // users ?
    true,                   // rooms
    req.query.limit || 50,  // limit
    req.query.skip || 0,    // skip
    false,                  // lightsearch
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
