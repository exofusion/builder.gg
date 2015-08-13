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
    processed: Boolean,
    cached: Boolean
});

var matchCacheItemSchema = new Schema({
    _id: Number,
    data: Object
});

var itemSchema = new Schema({
    itemId: Number,
    popularity: Number,
    quantity: Number
});

var itemBuildSchema = new Schema({
    gameTime: Number,
    averageGold: Number,
    items: [itemSchema],
    //consumables: [consumable]
});

var itemBuildStatsSchema = new Schema({
    samples: Number,
    championId: Number,
    tier: Number,
    patch: String,
    victory: Boolean,
    lane: String,
    role: String,
    itemBuildTimeline: [itemBuildSchema],
    matchIds: [Number]
});

exports.SeedSummoner = mongoose.model('SeedSummoner', seedSummonerSchema);
exports.MatchQueueItem = mongoose.model('MatchQueueItem', matchQueueItemSchema);
exports.MatchCacheItem = mongoose.model('MatchCacheItem', matchCacheItemSchema);
exports.Item = mongoose.model('Item', itemSchema);
exports.ItemBuild = mongoose.model('ItemBuild', itemBuildSchema);
exports.ItemBuildStats = mongoose.model('ItemBuildStats', itemBuildStatsSchema);

exports.mongoose = mongoose;
exports.disconnect = function(){ mongoose.disconnect(); }