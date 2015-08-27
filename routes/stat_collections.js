var express = require('express');
var router = express.Router();

var models = require('../scripts/models');
var StatCollection = models.StatCollection;

function CombineStats(victory_stats, defeat_stats) {
    var combined_stats = {};
    combined_stats.samples = victory_stats.samples + defeat_stats.samples;
    combined_stats.role = victory_stats.role;
    combined_stats.lane = victory_stats.lane;
    combined_stats.patch = victory_stats.patch;
    combined_stats.tier = victory_stats.tier;
    combined_stats.championId = victory_stats.championId;

    // trinketBuilds

    combined_stats.itemBuilds = victory_stats.itemBuilds;
    for (frame in defeat_stats.itemBuilds) {
        if (combined_stats.itemBuilds[frame]) {
            for (build in defeat_stats.itemBuilds[frame]) {
                if (combined_stats.itemBuilds[frame][build]) {
                    combined_stats.itemBuilds[frame][build] += defeat_stats.itemBuilds[frame][build];
                } else {
                    combined_stats.itemBuilds[frame][build] = defeat_stats.itemBuilds[frame][build];
                }
            }
        } else {
            combined_stats.itemBuilds[frame] = defeat_stats.itemBuilds[frame];
        }
    }

    // matchFrameData

    combined_stats.aggregateStats = victory_stats.aggregateStats;
    for (frame in defeat_stats.aggregateStats) {
        if (combined_stats.aggregateStats[frame]) {
            combined_stats.aggregateStats[frame].samples += defeat_stats.aggregateStats[frame].samples;
            combined_stats.aggregateStats[frame].kills += defeat_stats.aggregateStats[frame].kills;
            combined_stats.aggregateStats[frame].assists += defeat_stats.aggregateStats[frame].assists;
            combined_stats.aggregateStats[frame].deaths += defeat_stats.aggregateStats[frame].deaths;
        } else {
            combined_stats.aggregateStats[frame] = defeat_stats.aggregateStats[frame];
        }
    }

    return combined_stats;
}

router.get('/', function(req, res, next) {
    var combine_games = false;
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
            if (req.query.victory == 'both') {
                search_options.victory = true;
                combine_games = true;
            } else {
                search_options.victory = (req.query.victory == "true") ? true : false;
            }
        }

        StatCollection.findOne(search_options, function(error, stat_collection) {
            if (error) {
                 console.log(error);
            }

            if (combine_games) {
                // If we find a stat_collection, populate search options with it
                if (stat_collection) {
                    search_options = {};
                    search_options.patch = stat_collection.patch;
                    search_options.championId = stat_collection.championId;
                    search_options.tier = stat_collection.tier;
                    search_options.lane = stat_collection.lane;
                    search_options.role = stat_collection.role;
                }
                search_options.victory = false;

                // Search for defeats now
                StatCollection.findOne(search_options, function(error, stat_collection_defeat) {
                    if (error) {
                         console.log(error);
                    } else if (stat_collection && stat_collection_defeat) {
                        res.send(CombineStats(stat_collection, stat_collection_defeat));
                    } else if (stat_collection_defeat) {
                        // No victories, but we found a defeat
                        res.send(stat_collection_defeat);
                    } else if (stat_collection) {
                        // No defeats found, just return victories
                        res.send(stat_collection);
                    } else {
                        // Didn't find victories or defeats for search terms
                        res.status(404).end();
                    }
                });
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
