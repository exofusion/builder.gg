var async = require('async');
var models = require('./models');
var riot_api = require('./riot_api');

var MatchQueueItem = models.MatchQueueItem;
var MatchCacheItem = models.MatchCacheItem;
var MatchProcessed = models.MatchProcessed;
var StatCollection = models.StatCollection;
var MatchFrameData = models.MatchFrameData;

var ITEM_HEALTH_POTION = 2003;
var ITEM_MANA_POTION = 2004;

var ItemList;
riot_api.getItemList(function(json_data){ItemList = json_data;});

function AggregateStats(gT, s, tG, cG, hPU, mPU, tWP, vWP, sWP, i){
    this.gameTime =             (gT == undefined)   ? 0 : gT;
    this.samples =              (s == undefined)    ? 0 : s;
    this.totalGold =            (tG == undefined)   ? 0 : tG;
    this.currentGold =          (cG == undefined)   ? 0 : cG;
    this.healthPotsUsed =       (hPU == undefined)  ? 0 : hPU;
    this.manaPotsUsed =         (mPU == undefined)  ? 0 : mPU;
    this.trinketWardsPlaced =   (tWP == undefined)  ? 0 : tWP;
    this.visionWardsPlaced =    (vWP == undefined)  ? 0 : vWP;
    this.sightWardsPlaced =     (sWP == undefined)  ? 0 : sWP;
    this.items =                (i == undefined)    ? {} : i;
}

function mergeStat(thisStat, thisSamples, otherStat, otherSamples) {
    return (otherStat * otherSamples + thisStat * thisSamples) / (otherSamples + thisSamples);
}

AggregateStats.prototype.mergeSamples = function(otherStats){
    this.totalGold = mergeStat(this.totalGold, this.samples, otherStats.totalGold, otherStats.samples);
    this.currentGold = mergeStat(this.currentGold, this.samples, otherStats.currentGold, otherStats.samples);
    this.healthPotsUsed = mergeStat(this.healthPotsUsed, this.samples, otherStats.healthPotsUsed, otherStats.samples);
    this.manaPotsUsed = mergeStat(this.manaPotsUsed, this.samples, otherStats.manaPotsUsed, otherStats.samples);
    this.trinketWardsPlaced = mergeStat(this.trinketWardsPlaced, this.samples, otherStats.trinketWardsPlaced, otherStats.samples);
    this.visionWardsPlaced = mergeStat(this.visionWardsPlaced, this.samples, otherStats.visionWardsPlaced, otherStats.samples);
    this.sightWardsPlaced = mergeStat(this.sightWardsPlaced, this.samples, otherStats.sightWardsPlaced, otherStats.samples);

    for (i in otherStats.items) {
        if (this.items[i] == undefined) {
            this.items[i] = otherStats.items[i];
        } else {
            this.items[i].quantity += otherStats.items[i].quantity;
            this.items[i].frequency += otherStats.items[i].frequency;
        }
    }

    this.samples = this.samples + otherStats.samples;
}

// {{item_id}}: quantity => {{item_id}}: {quantity, frequency}

function PrepareItems(items){
    var newItems = {};
    for (var i in items) {
        newItems[i] = { quantity: items[i], frequency: 1 };
    }
    return newItems;
}

function ParticipantState(){
    this.items = {};
    this.health_pots_used = 0;
    this.mana_pots_used = 0;
    this.trinket_wards_placed = 0;
    this.vision_wards_placed = 0;
    this.sight_wards_placed = 0;
}

function ParticipantRecord(){
    this.state = null;
    this.timestamp = null;
    this.pframe = null;
}

ParticipantState.prototype.addItem = function(item_id) {
    if (this.items[item_id] == undefined) {
        this.items[item_id] = 1;
    } else {
        this.items[item_id]++;
    }
}

ParticipantState.prototype.removeItem = function(item_id) {
    if (this.items[item_id] > 1) {
        this.items[item_id]--;
    } else {
        delete this.items[item_id];
    }
}

ParticipantState.prototype.handleEvent = function(event) {
    var thisInventoryItemId = this.items[event.itemId];
    switch(event.eventType) {
        case 'ITEM_PURCHASED':
            this.addItem(event.itemId);
            break;
        case 'ITEM_SOLD':
            this.removeItem(event.itemId);
            break;
        case 'ITEM_UNDO':
            this.removeItem(event.itemBefore);
            if (event.itemAfter > 0) {
                this.addItem(event.itemAfter);
            }
            break;
        case 'ITEM_DESTROYED':
            switch(event.itemId) {
                case ITEM_HEALTH_POTION:
                    this.health_pots_used++;
                    break;
                case ITEM_MANA_POTION:
                    this.mana_pots_used++;
                    break;
            }
            // Check for consumables here
            this.removeItem(event.itemId);
            break;
        case 'WARD_PLACED':
            switch (event.wardType) {
                case 'YELLOW_TRINKET':
                case 'YELLOW_TRINKET_UPGRADE':
                    this.trinket_wards_placed++;
                    break;
                case 'SIGHT_WARD':
                    this.sight_wards_placed++;
                    break;
                case 'VISION_WARD':
                    this.vision_wards_placed++;
                    break;
                case 'UNDEFINED':
                    // Happens with Wolf Spirit / Farsight Orb, do nothing
                case 'TEEMO_MUSHROOM':
                    break;
                default:
                    console.log('[ERROR] Unknown ward type: '+event.wardType);
            }
            break;
        case 'SKILL_LEVEL_UP':
            // Don't do anything with this for now
            break;
        default:
            console.log('[ERROR] Unknown event: '+event.eventType);
    }
}

function recordSnapshot(timestamp, state_history, p_frames, participant_states) {
    for (var p in participant_states) {
        var pRecord = new ParticipantRecord();
        pRecord.timestamp = timestamp;
        pRecord.state = participant_states[p];
        pRecord.pframe = p_frames[p];

        // Convert to/from JSON so we can actually save our ParticipantRecord
        // *** Replace ParticipantRecord altogether with {} object here?
        state_history[p].push(JSON.parse(JSON.stringify(pRecord)));
    }
}

function recordProcessed(matchId, callback){
    // Update the MatchQueueItem so we don't process this match again
    MatchProcessed.update({ _id: matchId },
                          { _id: matchId },
                          { upsert: true },
                          function(error)
                          {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('[PROCESSED] Match '+matchId);
                                callback();
                            }
                          });
}

function processStateHistory(json_data, state_history, tier, callback) {
    async.eachSeries(Object.keys(state_history), function(p, next_p) {
        var participant_history = state_history[p];
        var matched_json = false;
        var winning_team = 0;

        if (json_data.teams[0].winner) {
            winning_team = json_data.teams[0].teamId;
        } else {
            winning_team = json_data.teams[1].teamId;
        }

        for (var j in json_data.participants) {
            var json_p = json_data.participants[j];
            if (json_p.participantId == p) {
                var victory = (json_p.teamId == winning_team) ? true : false;

                StatCollection.findOne({ championId: json_p.championId,
                                         tier: tier,
                                         victory: victory,
                                         patch: json_data.matchVersion,
                                         lane: json_p.timeline.lane,
                                         role: json_p.timeline.role },
                    function(error, stat_collection){
                        if (error) {
                            console.log(error);
                        } else {
                            if (!stat_collection) {
                                stat_collection = new StatCollection();
                                stat_collection.championId = json_p.championId;
                                stat_collection.tier = tier;
                                stat_collection.victory = victory;
                                stat_collection.patch = json_data.matchVersion;
                                stat_collection.lane = json_p.timeline.lane;
                                stat_collection.role = json_p.timeline.role;
                                stat_collection.samples = 0;
                                stat_collection.aggregateStats = [];
                            } else {
                                for (var j=0; j<stat_collection.matchFrameData.length; j++) {
                                    if (stat_collection.matchFrameData[j]._id == json_data.matchId) {
                                        console.log('[ERROR] This match has already been added');
                                        return;
                                    }
                                }
                            }

                            var match_frame_data = new MatchFrameData();
                            match_frame_data._id = json_data.matchId;

                            for (var j=0; j<participant_history.length; j++) {
                                if (participant_history[j].pframe.position) {
                                    var this_coord = {};
                                    this_coord.x = participant_history[j].pframe.position.x;
                                    this_coord.y = participant_history[j].pframe.position.y;
                                    match_frame_data.coords.push({ x: this_coord.x, y: this_coord.y });
                                }

                                var p_history = participant_history[j];

                                var aggregate_frame = new AggregateStats( p_history.timestamp,
                                                                          1,
                                                                          p_history.pframe.totalGold,
                                                                          p_history.pframe.currentGold,
                                                                          p_history.state.health_pots_used,
                                                                          p_history.state.mana_pots_used,
                                                                          p_history.state.trinket_wards_placed,
                                                                          p_history.state.vision_wards_placed,
                                                                          p_history.state.sight_wards_placed,
                                                                          PrepareItems(p_history.state.items));

                                if (stat_collection.aggregateStats[j] != undefined) {
                                    aggregate_frame.mergeSamples(stat_collection.aggregateStats[j]);
                                }
                                stat_collection.aggregateStats[j] = aggregate_frame;
                            }

                            stat_collection.matchFrameData.push(match_frame_data);

                            stat_collection.markModified('aggregateStats');
                            stat_collection.samples++;
                            stat_collection.save(function(error)
                                                {
                                                    if (error) {
                                                        console.log(error);
                                                        // Continue processing if we encounter an error in saving the stat_collection,
                                                        // but callback() here so that we don't mark this match as processed
                                                        // TODO: Add __v (version) to document?
                                                        callback();
                                                    }
                                                });
                        } // close "if (error) else"
                    }); // close "findOne(function)"
                // TEST BUILD MATCHES FINAL BUILD
                next_p();
            } // close "if (json_data.participantId == p)""
        }
    }, function(){ recordProcessed(json_data.matchId, callback); });
}

function processFrames(json_data, tier, callback) {
    if (json_data.timeline) {
        var state_history = {};
        var participant_states = {};
        json_data.participants.forEach( function(participant) {
            participant_states[participant.participantId] = new ParticipantState();
            state_history[participant.participantId] = [];
        });

        for (var i=0; i<json_data.timeline.frames.length; i++) {
            frame = json_data.timeline.frames[i];
            var p_frames = frame.participantFrames;

            if (frame.events) {
                for (var j=0; j<frame.events.length; j++) {
                    var event = frame.events[j];

                    var p_id;
                    if (event.participantId != undefined || event.creatorId != undefined) {
                        if (event.creatorId != undefined) {
                            p_id = event.creatorId;
                        } else {
                            p_id = event.participantId;
                        }

                        if (p_id != 0) {
                            participant_states[p_id].handleEvent(event);
                        }
                    }
                }
            }

            recordSnapshot(frame.timestamp, state_history, p_frames, participant_states);
        }

        // Verify and record results
        processStateHistory(json_data, state_history, tier, callback);
    } else {
        console.log('[ERROR] No timeline data for this match: '+json_data.matchId);
        callback();
    }
}

function selectMatch() {
    // EGF: 1918011420
    // 1918055064
    MatchQueueItem.find({cached: true},
        function(error, mqi) {
        if (error) {
            console.log(error);
        } else if (mqi.length) {
            // Do this synchronously so that we don't end up modifying the same record
            async.eachSeries(mqi, function(mqi_entry, next_mqi){
                MatchProcessed.findOne({_id: mqi_entry._id}, function(error, mp){
                    if (error) {
                        console.log(error);
                    } else {
                        if (!mp) {
                            MatchCacheItem.findOne({ _id: mqi_entry._id }, function(error, mci) {
                                if (error) {
                                    console.log(error);
                                } else if (mci) {
                                    if (mci.data) {
                                        processFrames(mci.data, mqi_entry.tier, next_mqi);
                                    } else {
                                        console.log("[ERROR] MatchCacheItem's data is null: "+mqi_entry._id);
                                        next_mqi();
                                    }
                                } else {
                                    console.log("[ERROR] MatchCacheItem doesn't exist: "+mqi_entry._id);
                                }
                            });
                        } else {
                            // Already processed this match
                            next_mqi();
                        }
                    }
                });
            }, function(){ console.log('[FINISHED]'); });
        } else {
            console.log('[ERROR] No MatchQueueItems ready to be processed');
        }
    }).sort({timestamp: -1});
}

selectMatch();