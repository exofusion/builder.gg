var request = require('request');
var fs = require('fs');

var TIMEOUT = 0;
var RATE_LIMIT_TIMOUT = 15000;
var RETRY = 3;

var api_key = require('./api_key');
var api_key = 'api_key='+api_key.api_key;

var region = 'na';

var url_base = 'https://'+region+'.api.pvp.net/api/lol/'+region+'/';

var url_summoner_by_name = 'v1.4/summoner/by-name/';
var url_league_by_summoner = 'v2.5/league/by-summoner/';
var url_league_master = 'v2.5/league/master?type=RANKED_SOLO_5x5';
var url_league_challenger = 'v2.5/league/challenger?type=RANKED_SOLO_5x5';
var url_matchlist_by_summoner = 'v2.2/matchlist/by-summoner/';
var url_matchlist_parameters = 'rankedQueues=RANKED_SOLO_5x5&seasons=SEASON2015';
var url_match = 'v2.2/match/';
var url_match_timeline = '?includeTimeline=true';

var local_item_list = '/static_json/itemlist.json';

function handleResponse(error, response, body, url, callback, retries_left) {
    if (retries_left >= 0)
    {
        if (!error && response.statusCode == 200) {
            var league_json = JSON.parse(body);
            setTimeout( function(){ callback(league_json); }, TIMEOUT );
        } else if (error) {
            console.log(error);
        } else if (response.statusCode == 429) {
            console.log('[429] API Rate Limit Reached ('+retries_left+' retries left)');
            setTimeout( function(){
                request(url, function(error, response, body){
                                      handleResponse(error, response, body, url, callback, retries_left-1); });}, RATE_LIMIT_TIMOUT);
        } else if (response.statusCode = 404) {
            console.log('[404] Not Found');
            callback(null);
        } else {
            console.log('Status Code: '+response.statusCode);
        }
    } else {
        console.log('No retries left');
    }
}

exports.getLeagueBySummonerId = function(summoner_id, callback) {
    var url = url_base+url_league_by_summoner+summoner_id+'?'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getMasterLeague = function(callback) {
    var url = url_base+url_league_master+'&'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getChallengerLeague = function(callback) {
    var url = url_base+url_league_challenger+'&'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getSummonerIdByName = function(summoner_name, callback) {
    var url = url_base+url_summoner_by_name+summoner_name+'?'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getMatchList = function(summoner_id, callback) {
    var url = url_base+url_matchlist_by_summoner+summoner_id+'?'+url_matchlist_parameters+'&'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getMatch = function(match_id, callback) {
    var url = url_base+url_match+match_id+url_match_timeline+'&'+api_key;
    request(url, function(error, response, body){
                          handleResponse(error, response, body, url, callback, RETRY)});
}

exports.getItemList = function(callback) {
    fs.readFile( __dirname + local_item_list, function (error, data) {
        if (error) {
            console.log(error); 
        }
        callback(JSON.parse(data));
    });
}