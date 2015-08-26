var express = require('express');
var router = express.Router();

var models = require('../scripts/models');
var StatCollection = models.StatCollection;

router.get('/', function(req, res, next) {
    var search_options = {};

    if (req.query.championId) {
        search_options.patch = '5.16';

        search_options.championId = parseInt(req.query.championId);

        if (req.query.tier) {
            search_options.tier = parseInt(req.query.tier);
        }

        if (req.query.position) {
            console.log(req.query.position);
            switch(req.query.position) {
                case 'Top':
                    search_options.lane = 'TOP';
                    break;
                case 'Jungle':
                    search_options.lane = 'JUNGLE';
                    break;
                case 'Mid':
                    search_options.lane = 'MIDDLE';
                    break;
                case 'Bottom':
                    search_options.lane = 'BOTTOM';
                    break;
            }
            // switch case
        }

        /*
        if (req.query.patch) {
            search_options.patch = req.query.patch;
        }*/

        if (req.query.victory) {
            search_options.victory = (req.query.victory == "true") ? true : false;
        }

        StatCollection.findOne(search_options, function(error, stat_collection) {
            if (error) {
                 console.log(error);
            } else if (stat_collection) {
                res.send(stat_collection);
            } else {
                res.status(404).end();
            }
        }).sort({samples: -1});
    } else {
        res.status(404).end();
    }
});

module.exports = router;
