var riot_api = require('./riot_api');
var models = require('./models');
var util_functions = require('./utility_functions.js')

var SeedSummoner = models.SeedSummoner;

function processLeague(league) {
    if (league.queue == "RANKED_SOLO_5x5") {
        league.entries.forEach( function(entry) {
            SeedSummoner.update({ _id: entry.playerOrTeamId },
                                { _id: entry.playerOrTeamId,
                                  name: entry.playerOrTeamName,
                                  tier: util_functions.tierInts[league.tier],
                                  division: util_functions.divisionInts[entry.division],
                                  isInactive: entry.isInactive,
                                  wins: entry.wins,
                                  losses: entry.losses,
                                  last_updated: new Date() },
                                { upsert: true },
                                function (error) { if (error) console.log(error); });
        });
        console.log('[ADDED] ['+league.tier+']\t '+league.name+': \t'+league.entries.length+' summoners');
        return true;
    }
    return false;
}

function insertLeagueSummoners(json_data) {
    if (json_data != null)
    {
        var ranked_info = false;
        var summoner_id = Object.keys(json_data)[0];
        if (json_data.entries == undefined) {
          var summoner_league = json_data[ summoner_id ];
          summoner_league.forEach( function(league) {
              ranked_info = ranked_info || processLeague(league);
          });
        } else {
          ranked_info = ranked_info || processLeague(json_data);
        }
        if (!ranked_info) {
          SeedSummoner.update({ _id: summoner_id }, { tier: 0 }, function(error){
            if (error) {
              console.log(error);
            } else {
              console.log("[WARNING] No ranked solo information for "+summoner_id);
            }
          });
        }
    } else {
        console.log('[ERROR] Null JSON data returned');
    }
}

function getSeedSummonerId(json_data) {
    if (json_data != null)
    {
        var summoner_id = json_data[ Object.keys(json_data)[0] ].id;
        riot_api.getLeagueBySummonerId(summoner_id, insertLeagueSummoners);
    } else {
        console.log('[ERROR] Null JSON data returned');
    }
}

exports.getSeedSummonerId = getSeedSummonerId;
exports.insertLeagueSummoners = insertLeagueSummoners;