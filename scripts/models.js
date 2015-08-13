var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/riotchallenge');

var seedSummonerSchema = new Schema({
  _id: Number,
  name: String,
  tier: Number,
  division: Number,
  isInactive: Boolean,
  wins: Number,
  losses: Number,
  last_updated: Date,
  last_match_queued: Date
});

var matchQueueItemSchema = new Schema({
    _id: Number,
    tier: Number,
    division: Number,
    queue: String,
    season: String,
    champion: Number,
    lane: String,
    role: String,
    timestamp: Number,
    date_added: Date,
    processed: Boolean,
    cached: Boolean
});

var matchCacheItemSchema = new Schema({
    _id: Number,
    data: Object
});

exports.SeedSummoner = mongoose.model('SeedSummoner', seedSummonerSchema);
exports.MatchQueueItem = mongoose.model('MatchQueueItem', matchQueueItemSchema);
exports.MatchCacheItem = mongoose.model('MatchCacheItem', matchCacheItemSchema);
exports.mongoose = mongoose;
exports.disconnect = function(){ mongoose.disconnect(); }