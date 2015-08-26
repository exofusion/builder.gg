var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.subdomains.indexOf('champion') > -1) {
    res.render('build_stats', { title: 'champion.builder.gg' });
  } else {
    res.render('index', { title: 'item.builder.gg' });
  }
});

module.exports = router;
