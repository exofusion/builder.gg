var express = require('express');
var router = express.Router();
var crypto = require('crypto');

var models = require('../scripts/models');
var ItemSetEntry = models.ItemSetEntry;

router.get('/', function(req, res, next) {

});

router.post('/', function(req, res, next) {
    var hashed_json = crypto.createHash('md5').update(JSON.stringify(req.body)).digest("hex");

    var itemSetEntry = new ItemSetEntry();
    itemSetEntry._id = hashed_json;
    itemSetEntry.data = req.body;
    itemSetEntry.date = new Date();
    itemSetEntry.save(function(error){
        if (error) {
            console.log(error);
        }
    });

    res.send(hashed_json);
});

module.exports = router;
