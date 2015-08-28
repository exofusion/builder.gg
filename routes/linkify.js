var express = require('express');
var router = express.Router();
var crypto = require('crypto');

var models = require('../scripts/models');
var ItemSetEntry = models.ItemSetEntry;

router.get('/', function(req, res, next) {
    ItemSetEntry.findOne({ _id: req.query.b }, function(error, ise) {
        if (error) {
            console.log(error);
        } else if (ise) {
            res.send(ise.data);
        } else {
            res.status(404).end();
        }
    });
});

router.post('/', function(req, res, next) {
    var hashed_json = crypto.createHash('md5').update(JSON.stringify(req.body)).digest("hex");

    var itemSetEntry = new ItemSetEntry();
    itemSetEntry._id = hashed_json;
    itemSetEntry.data = req.body;
    itemSetEntry.date_added = new Date();
    itemSetEntry.save(function(error){
        if (error) {
            console.log(error);
        }
    });

    res.send(hashed_json);
});

module.exports = router;
