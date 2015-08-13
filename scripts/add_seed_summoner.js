var riot_api = require('./riot_api');
var db_functions = require('./db_functions');

var summonerName;
var summonerId;

if (process.argv.indexOf("-n") != -1) {
    summonerName = process.argv[process.argv.indexOf("-n")+1];
} else if (process.argv.indexOf("-i") != -1) {
    summonerId = process.argv[process.argv.indexOf("-i")+1];
} else {
    console.log('Please pass a summoner name [-n "TestName"] or summoner id [-i 123456]');
}

if (summonerName != undefined) {
    riot_api.getSummonerIdByName(summonerName, db_functions.getSeedSummonerId);
} else if (summonerId != undefined) {
    riot_api.getLeagueBySummonerId(summonerId, db_functions.insertLeagueSummoners);
}