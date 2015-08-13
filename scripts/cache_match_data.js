var models = require('./models');
var riot_api = require('./riot_api');
var util = require('./utility_functions');

var MatchQueueItem = models.MatchQueueItem;
var MatchCacheItem = models.MatchCacheItem;

var current_mqi;
var current_tier = util.MAX_TIER;

function stepTier() {
    current_tier--;
    if (current_tier <= 0) {
        current_tier = util.MAX_TIER;
    }
}

function addMatchToCache(json_data) {
    var newMatchCacheItem = new MatchCacheItem({ _id: current_mqi._id,
                                                 data: json_data });

    newMatchCacheItem.save(function (error){
        if (error) {
            console.log(error);
        } else {
            current_mqi.cached = true;
            current_mqi.save(function(error){
                if (error) {
                    console.log(error);
                } else {
                    var match_date = new Date(current_mqi.timestamp);
                    console.log('[CACHED] ['+util.rankString(current_mqi.tier, current_mqi.division)+']'+
                                '\t('+match_date.toLocaleString('en-US')+')'+
                                '\t'+current_mqi._id);
                    stepTier();
                    selectMatchQueueItem();
                }
            });
        }
    });
}

function selectMatchQueueItem(){
    MatchQueueItem.find({ tier: current_tier, cached: {$ne: true}},
                          function(error, mqi){
                            if (error) {
                                console.log(error);
                            } else {
                                current_mqi = mqi[0];
                                riot_api.getMatch(current_mqi._id, addMatchToCache);
                            }
                        }).limit(1).sort({ timestamp: -1 });
}

selectMatchQueueItem();