'use strict';
var logger = require('../../../shared/util/logger').getLogger('web', __filename);
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
        logger.debug('rest/search error: ' + err);
        res.status(500).send('internal error');
      } else {
        res.status(200).send(results);
      }
    }
  );
});

module.exports = router;
