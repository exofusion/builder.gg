var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/build_stats', function(req, res, next) {
  res.render('build_stats', { title: 'Build Stats' });
});

module.exports = router;
