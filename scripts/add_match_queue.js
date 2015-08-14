var models = require('./models');
var riot_api = require('./riot_api');
var util_functions = require('./utility_functions');

var SeedSummoner = models.SeedSummoner;
var MatchQueueItem = models.MatchQueueItem;

var current_tier = util_functions.MAX_TIER;
var current_summoner;

function stepTier() {
    current_tier--;
    if (current_tier <= 0) {
        current_tier = util_functions.MAX_TIER;
    }
}

function addMatchQueueItem(json_data) {
    if (json_data != null)
    {
        json_data.matches.forEach( function(match){
            MatchQueueItem.update({ _id: match.matchId },
                                  { _id: match.matchId,
                                    tier: current_summoner.tier,
                                    division: current_summoner.division,
                                    champion: match.champion,
                                    lane: match.lane,
                                    role: match.role,
                                    season: match.season,
                                    queue: match.queue,
                                    timestamp: match.timestamp,
                                    added_by_summoner: current_summoner._id },
                                  { upsert: true },
                                  function(error){ if (error) console.log(error); });
        });

        SeedSummoner.update({ _id: current_summoner._id },
                            { last_match_queued: new Date() },
                            function(error){ if (error) console.log(error);});

        console.log('[QUEUED] ['+util_functions.rankString(current_summoner.tier, current_summoner.division)+
                    ']\t '+current_summoner.name+': \t'+
                    json_data.matches.length+' matches');
    } else {
        console.log('[ERROR] Null JSON data returned');
    }

    stepTier();
    selectSummoner();
}

function selectSummoner() {
    SeedSummoner.find({tier: current_tier},
                        function(error, summoner){
                            if (error) console.log(error);
                            else if (summoner) {
                                current_summoner = summoner[0];
                                riot_api.getMatchList(current_summoner._id, addMatchQueueItem);
                            }
                            else {
                                console.log("No summoners found for tier: "+tier)
                            }
                        })
                .limit(1)
                .sort({last_match_queued: 1});
}

selectSummoner();