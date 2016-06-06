var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.subdomains.indexOf('item') > -1) {
    res.render('index', { title: 'item.builder.gg' });
  } else {
    res.render('champion_stats', { title: 'champion.builder.gg' });
  }
});

module.exports = router;
