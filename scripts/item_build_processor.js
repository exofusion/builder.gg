var async = require('async');
var models = require('./models');
var riot_api = require('./riot_api');

var MatchQueueItem = models.MatchQueueItem;
var MatchCacheItem = models.MatchCacheItem;
var Item = models.Item;

var MINUTE = 60000;
var TRACK_INTERVAL = 10 * MINUTE;

var ITEM_HEALTH_POTION = 2003;
var ITEM_MANA_POTION = 2004;

var ItemList;
riot_api.getItemList(function(json_data){ItemList = json_data;});

/*
function Item(item_id, quantity){
    this.item_id = item_id;

    if (quantity == undefined) {
        this.quantity = 1;
    } else {
        this.quantity = quantity;
    }
}*/

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

ParticipantState.prototype.printState = function() {
    console.log('=== Items ===');
    for (item_id in this.items) {
        console.log('(x'+this.items[item_id]+') '+ItemList.data[item_id].name);
    }

/*
    console.log('\n=== Consumables ===');
    console.log('Health Potions Used: '+this.health_pots_used);
    console.log('Mana Potions Used: '+this.mana_pots_used);
    console.log('Trinket Wards Placed: '+this.trinket_wards_placed);
    console.log('Vision Wards Placed: '+this.vision_wards_placed);
    console.log('Sight Wards Placed: '+this.sight_wards_placed);*/
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
    for (p in participant_states) {
        var pRecord = new ParticipantRecord();
        pRecord.timestamp = timestamp;
        pRecord.state = participant_states[p];
        pRecord.pframe = p_frames[p];

        // Convert to/from JSON so we can actually save our ParticipantRecord
        state_history[p].push(JSON.parse(JSON.stringify(pRecord)));
    }
}

function processStateHistory(json_data, state_history, tier, callback) {
    for (p in state_history) {
        var participant_history = state_history[p];
        var matched_json = false;

        for (var i=0; !matched_json && i<json_data.participants.length; i++) {
            if (json_data.participants[i].participantId == p)
            {
                matched_json = true;

                // FUN STUFF GOES HERE

                /*
                for (var j=0; i<participant_history.length; j++) {
                    //console.log(participant_history[j]);
                }
                */

                // TEST BUILD MATCHES FINAL BUILD
            }
        }

        if (!matched_json) {
            console.log('[ERROR] Could not match the participantId in JSON.data.participants[]');
        }
    }

    console.log('[PROCESSED] Match '+json_data.matchId);
    callback();
}

function processFrames(json_data, tier, callback) {
    if (json_data.timeline) {
        var time_threshold = 1 * MINUTE; // Start at the first minute

        var state_history = {};
        var participant_states = {};
        json_data.participants.forEach( function(participant) {
            participant_states[participant.participantId] = new ParticipantState();
            state_history[participant.participantId] = [];
        });

        for (var i=0; i<json_data.timeline.frames.length; i++) {
            frame = json_data.timeline.frames[i];
            var p_frames = frame.participantFrames;
            var track = false;

            if (frame.timestamp > time_threshold) {
                time_threshold += TRACK_INTERVAL;
                track = true;
            }

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

            if (track) {
                recordSnapshot(frame.timestamp, state_history, p_frames, participant_states);
            }
        }
        
        // Record final snapshot so we can compare to the participant frame item build
        var final_frame = json_data.timeline.frames[json_data.timeline.frames.length-1];
        recordSnapshot(final_frame.timestamp, state_history, final_frame.participantFrames, participant_states);

        // Verify and record results
        processStateHistory(json_data, state_history, tier, callback);
    } else {
        console.log('[ERROR] No timeline data for this match: '+json_data.matchId);
    }
}

function selectMatch() {
    // EGF: 1918011420
    // 1918055064
    MatchQueueItem.find({ /* REMOVE THIS */ /*_id: 1918011420,*/ cached: true, processed: {$ne: true}},
        function(error, mqi) {
        if (error) {
            console.log(error);
        } else if (mqi.length) {
            async.eachSeries(mqi, function(mqi_entry, callback){
                MatchCacheItem.findOne({ _id: mqi_entry._id },
                    function(error, mci) {
                        if (error) {
                            console.log(error);
                        } else if (mci) {
                            if (mci.data) {
                                //processFrames(mci.data, mqi.tier, callback);
                                callback();
                            } else {
                                console.log("[ERROR] MatchCacheItem's data is null: "+mqi_entry._id);
                                callback();
                            }
                        } else {
                            console.log("[ERROR] MatchCacheItem doesn't exist: "+mqi_entry._id);
                        }
                    });
            }, function(){ console.log('[FINISHED]'); });
        } else {
            console.log('[ERROR] No MatchQueueItems ready to be processed');
        }
    }).sort({timestamp: -1});
}

selectMatch();