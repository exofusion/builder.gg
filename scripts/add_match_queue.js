var models = require('./models');
var riot_api = require('./riot_api');
var util = require('./utility_functions');

var SeedSummoner = models.SeedSummoner;
var MatchQueueItem = models.MatchQueueItem;

var current_tier = util.MAX_TIER;
var current_summoner;

function stepTier() {
    current_tier--;
    if (current_tier <= 0) {
        current_tier = util.MAX_TIER;
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
                                    date_added: new Date() },
                                  { upsert: true },
                                  function(error){ if (error) console.log(error); });
        });

        SeedSummoner.update({ _id: current_summoner._id },
                            { last_match_queued: new Date() },
                            function(error){ if (error) console.log(error);});

        console.log('[QUEUED] ['+util.rankString(current_summoner.tier, current_summoner.division)+
                    ']\t '+current_summoner.name+': \t'+
                    json_data.matches.length+' matches');
    } else {
        console.log('[ERROR] Null JSON data returned');
    }

    stepTier();
    selectSummoner();
}

function selectSummoner() {
    // Step through tiers
    //SeedSummoner.find({tier: current_tier},
    SeedSummoner.find({},
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