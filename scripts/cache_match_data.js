var models = require('./models');
var riot_api = require('./riot_api');
var util_functions = require('./utility_functions');

var MatchQueueItem = models.MatchQueueItem;
var MatchCacheItem = models.MatchCacheItem;
var SeedSummoner = models.SeedSummoner;

var current_mqi;
var current_tier = util_functions.MAX_TIER;

function stepTier() {
    current_tier--;
    if (current_tier <= 0) {
        current_tier = util_functions.MAX_TIER;
    }
}

function addMatchToCache(json_data) {
    var newMatchCacheItem = new MatchCacheItem({ _id: current_mqi._id,
                                                 data: json_data });

    newMatchCacheItem.save(function (error){
        if (error) {
            console.log(error);
            if (error.code == 11000) { // Duplicate key error
                // continue on
            } else {
                return;
            }
        }
        current_mqi.cached = true;
        current_mqi.save(function(error){
            if (error) {
                console.log(error);
            } else {
                var match_date = new Date(current_mqi.timestamp);
                console.log('[CACHED] ['+util_functions.rankString(current_mqi.tier, current_mqi.division)+']'+
                            '\t('+match_date.toLocaleString('en-US')+')'+
                            '\t'+current_mqi._id);

                if (json_data == null) {
                    console.log('[WARNING] Null data returned');
                } else {
                    // Mark the last_active attribute for the summoners in this game
                    json_data.participantIdentities.forEach( function(p){
                        SeedSummoner.findOne({ _id: p.player.summonerId }, function(error, ss){
                            if (error) {
                                console.log(error);
                            } else {
                                // Check if we found a SeedSummoner
                                if (ss) {
                                    if (ss.last_active > match_date) {
                                        // We already have a more recent date attached to last_active, so don't
                                        // update with out of date info
                                        return;
                                    }
                                }

                                SeedSummoner.update({ _id: p.player.summonerId },
                                                    { _id: p.player.summonerId,
                                                      name: p.player.summonerName,
                                                      last_active: match_date },
                                                    { upsert: true },
                                                    function(error){
                                                        if (error) {
                                                            console.log(error);
                                                        }
                                                    });
                            }
                        })
                    })
                }

                stepTier();
                selectMatchQueueItem();
            }
        });
    });
}

function selectMatchQueueItem(){
    MatchQueueItem.find({ tier: current_tier, cached: {$ne: true}},
                          function(error, mqi){
                            if (error) {
                                console.log(error);
                            } else if (mqi[0]) {
                                current_mqi = mqi[0];
                                riot_api.getMatch(current_mqi._id, addMatchToCache);
                            } else {
                                console.log('[WARNING] No match queue items found for tier: '+current_tier);
                                stepTier();
                                selectMatchQueueItem();
                            }
                        }).limit(1).sort({ timestamp: -1 });
}

selectMatchQueueItem();