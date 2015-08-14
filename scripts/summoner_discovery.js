var async = require('async');

var riot_api = require('./riot_api');
var models = require('./models');
var db_functions = require('./db_functions');
var util_functions = require('./utility_functions');

var SeedSummoner = models.SeedSummoner;
var MatchQueueItem = models.MatchQueueItem;
var MatchCacheItem = models.MatchCacheItem;

var current_tier = util_functions.MAX_TIER;
var skip_num = 0;

function stepTier() {
    /*
    current_tier--;
    if (current_tier <= 0) {
        current_tier = util_functions.MAX_TIER;
        skip_num++;
    }
    */
    skip_num++;
    selectMatchCacheItem();
}

function selectMatchCacheItem() {
    if (skip_num == 0 /*&& current_tier == util_functions.tierInts['CHALLENGER']*/) {
        riot_api.getChallengerLeague(function(json_data){
            db_functions.insertLeagueSummoners(json_data);
            stepTier();
        });
    } else if (skip_num == 1 /*&& current_tier == util_functions.tierInts['MASTER']*/) {
        riot_api.getMasterLeague(function(json_data){
            db_functions.insertLeagueSummoners(json_data);
            stepTier();
        });
    } else {
        // Step through tiers
        //MatchQueueItem.find({ tier: current_tier, cached: true }, function(error, mqi){
        // TODO: Don't limit to 1 result, iterate through full result list
        MatchQueueItem.find({ cached: true }, function(error, mqi){
            if (error) {
                console.log(error);
            } else {
                if (mqi.length)
                {
                    mqi = mqi[0];
                    MatchCacheItem.findOne({ _id: mqi._id }, function(error, mci){
                        if (mci)
                        {
                            if (mci.data)
                            {
                                var identities = mci.data.participantIdentities;
                                async.eachSeries(identities, function(participant, next_participant)
                                {
                                    SeedSummoner.findOne({_id: participant.player.summonerId}, function(error, summoner)
                                    {
                                        if (error) {
                                            console.log(error);
                                        } else if (summoner) {
                                            next_participant();
                                        } else {
                                            riot_api.getLeagueBySummonerId( participant.player.summonerId,
                                                                            function(json_data){
                                                                                db_functions.insertLeagueSummoners(json_data);
                                                                                next_participant();
                                                                            });
                                        }
                                    });
                                }, function(){
                                    stepTier();
                                });
                            } else {
                                console.log("[ERROR] MatchCacheItem's data is null: "+mqi._id);
                                stepTier();
                            }
                        } else {
                            console.log("[ERROR] Couldn't match MatchQueueItem to MatchCacheItem: "+mqi._id);
                            stepTier();
                        }
                    });
                } else {
                    stepTier();
                }
            }
        }).limit(1).sort({ timestamp: -1 }).skip(skip_num);
    }
}

selectMatchCacheItem();