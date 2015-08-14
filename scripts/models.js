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
    cached: Boolean,
    added_by_summoner: Number
});

var matchCacheItemSchema = new Schema({
    _id: Number,
    data: {}
});

var matchProcessedSchema = new Schema({
    _id: Number
}, {collection: 'matchprocessed'});

/*
var itemSchema = new Schema({
    itemId: Number,
    frequency: Number,
    quantity: Number
});
*/

/*
var coordSchema = new Schema({
    x: Number,
    y: Number
});
*/

/*
var aggregateFrameDataSchema = new Schema({
    gameTime: Number,
    samples: Number,
    totalGold: Number,
    currentGold: Number,
    healthPotsUsed: Number,
    manaPotsUsed: Number,
    trinketWardsPlaced: Number,
    visionWardsPlaced: Number,
    sightWardsPlaced: Number,
    items: Object
});
*/

var matchFrameDataSchema = new Schema({
    _id: Number, // MatchID
    coords: []
});

var statCollectionSchema = new Schema({
    championId: Number,
    tier: Number,
    patch: String,
    victory: Boolean,
    lane: String,
    role: String,
    samples: Number,
    aggregateStats: [ {} ],
    matchFrameData: [matchFrameDataSchema]
});

exports.SeedSummoner = mongoose.model('SeedSummoner', seedSummonerSchema);
exports.MatchQueueItem = mongoose.model('MatchQueueItem', matchQueueItemSchema);
exports.MatchCacheItem = mongoose.model('MatchCacheItem', matchCacheItemSchema);
exports.MatchProcessed = mongoose.model('MatchProcessed', matchProcessedSchema);
//exports.Item = mongoose.model('Item', itemSchema);
//exports.Coord = mongoose.model('Coord', coordSchema);
//exports.AggregateFrameData = mongoose.model('AggregateFrameData', aggregateFrameDataSchema);
exports.MatchFrameData = mongoose.model('MatchFrameData', matchFrameDataSchema);
exports.StatCollection = mongoose.model('StatCollection', statCollectionSchema);

exports.mongoose = mongoose;
exports.disconnect = function(){ mongoose.disconnect(); }