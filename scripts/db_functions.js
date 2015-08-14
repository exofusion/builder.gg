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
    }
}

function insertLeagueSummoners(json_data) {
    if (json_data != null)
    {
        if (json_data.entries == undefined) {
          var summoner_league = json_data[ Object.keys(json_data)[0] ];
          summoner_league.forEach( function(league) {
              processLeague(league);
          });
        } else {
          processLeague(json_data);
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