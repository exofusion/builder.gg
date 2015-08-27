var app = angular.module('coreApp', ['chart.js','ui.select','ngSanitize']);

var ddragon_url = 'http://ddragon.leagueoflegends.com/cdn/5.16.1/';

var kda_interval = 5;
var kda_last_minute = 50;
var kda_timeline_length = kda_last_minute / kda_interval // 5 minute intervals up to 60

var qty_item_id_constant = 10000;

function ItemlistEntry(id, name, cost, image, plaintext) {
  this.id = id;
  this.name = name;
  this.cost = cost;
  this.image = image;
  this.plaintext = plaintext;
  return this;
}

function SetRandoms($scope) {
  $scope.random_champ_idx = Math.round(Math.random()*($scope.champion_array.length-1));
  $scope.random_tier_idx = Math.round(Math.random()*($scope.tiers.length-1));

  var lanes = [ 'toplane',
                'jungle',
                'midlane',
                'botlane' ];
  $scope.random_lane_idx = Math.round(Math.random()*(lanes.length-1));

  $scope.random_champion = $scope.champion_array[$scope.random_champ_idx].name;
  $scope.random_tier = $scope.tiers[$scope.random_tier_idx].name;
  $scope.random_lane = lanes[$scope.random_lane_idx];
}

function GetChampionJson($scope, $http) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      $scope.champion_array = [];
      $scope.champion_json = res.data.data;
      var sorted_champions = Object.keys($scope.champion_json).sort(function(a,b){return $scope.champion_json[a].name.localeCompare($scope.champion_json[b].name);});
      for (champ in sorted_champions) {
        var champ_json = $scope.champion_json[sorted_champions[champ]];
        champ_json.image = ddragon_url+'img/champion/'+champ_json.key+'.png';
        $scope.champion_array.push(champ_json);
      }

      SetRandoms($scope);
    });
}

function GetItemlistJson($scope, $http) {
  $http.get('/static-json/itemlist.json')
  .then(function(res){
    $scope.itemlist_array = [];
    $scope.item = {};
    $scope.itemlist_json = res.data.data;
    for (item in $scope.itemlist_json) {
      $scope.itemlist_array.push( new ItemlistEntry( $scope.itemlist_json[item].id,
                                                     $scope.itemlist_json[item].name,
                                                     $scope.itemlist_json[item].gold.total,
                                                     ddragon_url+'img/item/'+$scope.itemlist_json[item].image.full,
                                                     $scope.itemlist_json[item].plaintext ));
    }
  });
}

function GetItemImage(scope, item_id) {
  return ddragon_url+'img/item/'+scope.itemlist_json[item_id].image.full;
}

app.controller('statDistributionCtrl', function($scope, $http, $timeout) {
  $scope.getNumber = function(num) {
    return new Array(num);   
  }

  $scope.getTotalCost = function() {
    return $scope.actual_cost.reduce(function(prevValue, curValue){
      return prevValue + curValue;
    });
  }

  $scope.getTotalEffectiveGold = function() {
    return $scope.effective_gold.reduce(function(prevValue, curValue){
      return prevValue + curValue;
    });
  }

  $scope.getTotalStat = function(index) {
    var stat_total = 0;
    for (var i=0; i<$scope.stat_tally.length; i++) {
      stat_total += $scope.stat_tally[i][index];
    }
    return stat_total;
  }

  $scope.getStatFromCost = function(cost, index) {
    return Math.round(cost/$scope.stat_distribution_stat_bases[index]);
  }

  $scope.displayItemSearch = function(item_slot) {
    var already_shown = ($scope.show_item_search && $scope.show_item_search[item_slot]) ? true : false;
    $scope.show_item_search = [];


    if (!already_shown) {
      $scope.show_item_search[item_slot] = true;

      // Highlight the search box so the user can begin entering input right away
      var uiSelect = angular.element('#item'+item_slot+' .ui-select-container').controller('uiSelect');
      $timeout(function() {
        uiSelect.focusser[0].focus();
        //uiSelect.open = true;
        uiSelect.activate();
      });
    }
  }

  $scope.clearItem = function(item_slot) {
    var datasets = $scope.stat_distribution_data.datasets;
    datasets[item_slot].label = "N/A";

    for (var i=0; i<datasets[item_slot].data.length; i++) {
      datasets[item_slot].data[i] = 0;
      $scope.stat_tally[item_slot][i] = 0;
    }

    $scope.effective_gold[item_slot] = 0;
    $scope.actual_cost[item_slot] = 0;
    $scope.build_item_image[item_slot] = '//:0';
    $scope.stat_distribution_chart.update();
    delete $scope.current_block.selected.items[item_slot];
    delete $scope.build_item[item_slot].selected;
  }

  $scope.getItemImage = function(item_id) {
    return GetItemImage($scope, item_id);
  }

  $scope.itemChange = function(item_slot, item_id) {
    var this_item = $scope.itemlist_json[item_id];
    var datasets = $scope.stat_distribution_data.datasets;
    var this_stat_tally = $scope.stat_tally[item_slot];

    datasets[item_slot].label = this_item.name;

    this_stat_tally[0] =  this_item.stats.FlatPhysicalDamageMod    ? this_item.stats.FlatPhysicalDamageMod       : 0;
    this_stat_tally[3] =  this_item.stats.PercentAttackSpeedMod    ? this_item.stats.PercentAttackSpeedMod*100   : 0;
    this_stat_tally[4] =  this_item.stats.FlatCritChanceMod        ? this_item.stats.FlatCritChanceMod*100       : 0;
    this_stat_tally[5] =  this_item.stats.FlatSpellBlockMod        ? this_item.stats.FlatSpellBlockMod           : 0;
    this_stat_tally[6] =  this_item.stats.FlatHPPoolMod            ? this_item.stats.FlatHPPoolMod               : 0;
    this_stat_tally[7] =  this_item.stats.PercentHPRegenMod        ? this_item.stats.PercentHPRegenMod*100       : 0;
    this_stat_tally[8] =  this_item.stats.FlatArmorMod             ? this_item.stats.FlatArmorMod                : 0;
    this_stat_tally[9] =  this_item.stats.FlatMovementSpeedMod     ? this_item.stats.FlatMovementSpeedMod        : 0;
    this_stat_tally[10] = this_item.stats.PercentMovementSpeedMod  ? this_item.stats.PercentMovementSpeedMod*100 : 0;
    this_stat_tally[11] = this_item.stats.FlatMPPoolMod            ? this_item.stats.FlatMPPoolMod               : 0;
    this_stat_tally[15] = this_item.stats.FlatMagicDamageMod       ? this_item.stats.FlatMagicDamageMod          : 0;

    var sanitizedDescription = $scope.itemlist_json[item_id].sanitizedDescription;
    var armorPenetration = sanitizedDescription.indexOf("Armor Penetration");
    var lifeSteal = sanitizedDescription.indexOf("Life Steal");
    var baseHealthRegen = sanitizedDescription.indexOf("Base Health Regen");
    var baseManaRegen = sanitizedDescription.indexOf("Base Mana Regen");
    var cooldownReduction = sanitizedDescription.indexOf("Cooldown Reduction");
    var magicPenetration = sanitizedDescription.indexOf("Magic Penetration");

    if (armorPenetration > -1) {
      this_stat_tally[1] = parseInt(sanitizedDescription.slice(armorPenetration-3, armorPenetration-1)) || 0;
    }
    if (lifeSteal > -1) {
      this_stat_tally[2] = parseInt(sanitizedDescription.slice(lifeSteal-4, lifeSteal).split('%')[0]) || 0;
    }
    if (baseHealthRegen > -1) {
      this_stat_tally[7] = parseInt(sanitizedDescription.slice(baseHealthRegen-5, baseHealthRegen).split('%')[0]) || 0;
    }
    if (baseManaRegen > -1) {
      this_stat_tally[12] = parseInt(sanitizedDescription.slice(baseManaRegen-5, baseManaRegen).split('%')[0]) || 0;
    }
    if (cooldownReduction > -1) {
      this_stat_tally[13] = parseInt(sanitizedDescription.slice(cooldownReduction-4, cooldownReduction).split('%')[0]) || 0;
    }
    if (magicPenetration > -1) {
      this_stat_tally[14] = parseInt(sanitizedDescription.slice(magicPenetration-3, magicPenetration-1)) || 0;
    }

    // Get "Effective Gold" stat
    var total_effective_gold = 0;
    for (var i=0; i<$scope.stat_distribution_label_map.length; i++)
    {
      $scope.stat_distribution_data.datasets[item_slot].data[i] = Math.floor(this_stat_tally[i]*
                                                                             $scope.stat_distribution_stat_bases[i]);
      total_effective_gold += $scope.stat_distribution_data.datasets[item_slot].data[i];
    }

/*
    // Update labels with stat amount
    for (var i=0; i<11; i++) {
      var total_stat = 0;
      for (var j=0; j<datasets.length; j++)
        total_stat += (datasets[j].data[i] / $scope.stat_distribution_stat_bases[i]);
      
      $scope.stat_distribution_data.labels[i] = $scope.stat_distribution_label_map[i]+' ('+total_stat+')';
    }*/

    $scope.actual_cost[item_slot] = this_item.gold.total;
    $scope.effective_gold[item_slot] = total_effective_gold;

    $scope.stat_distribution_chart.update();
    $scope.build_item_image[item_slot] = $scope.getItemImage(item_id);

    $scope.current_block.selected.items[item_slot] = item_id;
    $scope.build_item[item_slot].selected = new ItemlistEntry(this_item.id,
                                                              this_item.name,
                                                              this_item.gold.total,
                                                              $scope.getItemImage(this_item.id),
                                                              this_item.plaintext);

    // Hide item selection box again
    $timeout(function() {
      var uiSelect = angular.element('#item'+item_slot+' .ui-select-container').controller('uiSelect');
      uiSelect.focusser[0].blur();
      $scope.show_item_search = [];
      //uiSelect.open = true;
      //uiSelect.activate();
    });

    // Fill bars with icon
    /*
    $timeout(function() {
      var img=document.getElementById('item'+item_slot).getElementsByTagName('img')[0];
      var pat=$scope.stat_distribution_ctx.createPattern(img,"repeat");
      $scope.stat_distribution_chart.data.datasets[item_slot].fillColor = pat;
      $scope.stat_distribution_chart.update();
    });
    */
  }

  $scope.createNewBlock = function() {
    $scope.build_blocks.push({name: 'New Block', items: []});
    var bb_length = $scope.build_blocks.length;
    $scope.loadBlock($scope.build_blocks[bb_length-1]);
  }

  $scope.copyNewBlock = function() {
    $scope.build_blocks.push(JSON.parse(JSON.stringify($scope.this_block)));
    var bb_length = $scope.build_blocks.length;
    $scope.loadBlock($scope.build_blocks[bb_length-1]);
  }

  $scope.startRenaming = function() {
    $scope.currently_renaming = true;
    $scope.new_block_name = $scope.current_block.selected.name;

    $timeout(function(){
      angular.element('#rename-input-box').select();
    });
  }

  $scope.renameBlock = function(block, new_name) {
    block.name = new_name;
    $scope.currently_renaming = false;
  }

  $scope.deleteBlock = function(block) {
    $scope.build_blocks.splice($scope.build_blocks.indexOf(block),1);
    var bb_length = $scope.build_blocks.length;

    if ($scope.build_blocks.length > 0) {
      $scope.loadBlock($scope.build_blocks[bb_length-1]);
    } else {
      $scope.createNewBlock();
    }
  }

  $scope.loadBlock = function(block) {
    if (block) {
      $scope.current_block.selected = block;

      var temp = $scope.this_block;
      $scope.this_block = block;
      $scope.last_block = temp;

      for(var i=0; i<6; i++) { // Magic number...
        if (block.items[i] != undefined &&
            block.items[i] > 0) {
          $scope.itemChange(i, block.items[i])
        } else {
          $scope.clearItem(i)
        }
      }
    }
  }

  $scope.shareItemSet = function() {
    $scope.currently_saving = true;
    var save_object = {};
    save_object.name = $scope.build_name;
    save_object.blocks = $scope.build_blocks;
    var parameter = JSON.stringify(save_object);
      $http.post('/linkify', parameter).
      success(function(data, status, headers, config) {
          $scope.share_link = data;
          $scope.currently_saving = false;
        }).
        error(function(data, status, headers, config) {
          // Error saving item set
          $scope.currently_saving = false;
        });
  }

  $scope.exportItemSet = function() {
    var item_set = {};
    item_set.title = "Item Set Title";
    item_set.type = "custom";
    item_set.map = "any";
    item_set.mode = "any";
    item_set.priority = false;
    item_set.sortrank = 0;
    item_set.blocks = [];

    for (var i=0; i<$scope.build_blocks.length; i++) {
      var block = {};
      block.type = $scope.build_blocks[i].name;
      block.recMath = false;
      block.minSummonerLevel = -1;
      block.maxSummonerLevel = -1;
      block.showIfSummonerSpell = "";
      block.hideIfSummonerSpell = "";
      block.items = [];

      for (var j=0; j<$scope.build_blocks[i].items.length; j++) {
        block.items.push({ id: $scope.build_blocks[i].items[j].toString(),
                           count: 1 });
      }

      item_set.blocks.push(block);
    }

    var content = JSON.stringify(item_set);
    var filename = 'testfilename';
    var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    saveAs(blob, filename+".json");
  }

  $scope.Math = Math;

  $scope.build_item = [];
  $scope.build_item[0] = {};
  $scope.build_item[1] = {};
  $scope.build_item[2] = {};
  $scope.build_item[3] = {};
  $scope.build_item[4] = {};
  $scope.build_item[5] = {};

  //$scope.build_blocks[0] = {name: 'Default', items: []};
  //$scope.this_block = $scope.build_blocks[0];

  $scope.currently_renaming = false;

  $scope.effective_gold = [0, 0, 0, 0, 0, 0];
  $scope.actual_cost = [0, 0, 0, 0, 0, 0];

  //GetChampionJson($scope, $http);
  GetItemlistJson($scope, $http);

  $scope.build_item_image = [];

  // Stat Distribution Chart Setup
  $scope.stat_distribution_label_map = [ "AD",
                                         "ArP",
                                         "LS%",
                                         "AS%",
                                         "CrC%",
                                         "MR",
                                         "HP",
                                         "HRe%",
                                         "Ar",
                                         "MS",
                                         "MS%",
                                         "Ma",
                                         "MRe%",
                                         "CDR%",
                                         //"% Spellvamp",
                                         "MP",
                                         "AP" ];
  $scope.stat_distribution_labels = $scope.stat_distribution_label_map.slice();
  $scope.stat_distribution_stat_bases = [ 36.00, // AD
                                          12.00, // Armor Pen
                                          55,    // % Lifesteal
                                          30.00, // % AS
                                          50.00, // % Crit Chance
                                          20.00, // MR
                                          2.67,  // HP
                                          3.60,  // % Health Regen
                                          20.00, // Armor
                                          13.00, // MS
                                          39.50, // % MS
                                          2.00,  // Mana
                                          7.20,  // % Base Mana Regen
                                          31.67, // CDR
                                          //27.50, // % Spellvamp
                                          34.33, // Magic Pen
                                          21.75  // AP
                                        ];

  $scope.stat_tally = [];
  for(var i=0; i<6; i++) {
    $scope.stat_tally[i] = [];
    for (var j=0; j<$scope.stat_distribution_label_map.length; j++) {
      $scope.stat_tally[i][j] = 0;
    }
  }


/*
  $scope.stat_distribution_label_map = ["HP", "Mana", "Armor", "MR", "AD", "AP", "Health Regen", "Mana Regen", "Crit Chance", "AS", "MS"];
  $scope.stat_distribution_stat_bases = [ 2.67,
                                          2.00,
                                          20.00,
                                          20.00,
                                          36.00,
                                          21.75,
                                          3.60,
                                          7.20,
                                          50.00,
                                          30.00,
                                          13.00 ];
*/
  var stat_distribution_datasets =  [{
                            label: "N/A",
                            fillColor: "rgba(200,45,45,0.5)",
                            strokeColor: "rgba(200,45,45,1)",
                            pointColor: "rgba(200,45,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,45,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(200,200,45,0.5)",
                            strokeColor: "rgba(200,200,45,1)",
                            pointColor: "rgba(200,200,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,200,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,200,45,0.5)",
                            strokeColor: "rgba(45,200,45,1)",
                            pointColor: "rgba(45,200,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,200,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,200,200,0.5)",
                            strokeColor: "rgba(45,200,200,1)",
                            pointColor: "rgba(45,200,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,200,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,45,200,0.5)",
                            strokeColor: "rgba(45,45,200,1)",
                            pointColor: "rgba(45,45,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,45,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(200,45,200,0.5)",
                            strokeColor: "rgba(200,45,200,1)",
                            pointColor: "rgba(200,45,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,45,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         }];

  $scope.stat_distribution_options = { animationEasing: "easeOutElastic",
                                       scaleFontSize: 14,
                                       scaleFontColor: "#DDDDDD",
                                       scaleGridLineColor : "rgba(255,255,255,.15)",
                                       scaleShowVerticalLines: false,
                                       responsive: true };

  $scope.stat_distribution_data = { labels: $scope.stat_distribution_labels,
                                    datasets: stat_distribution_datasets };

  $scope.stat_distribution_ctx = document.getElementById("statDistributionChart").getContext("2d");
  $scope.stat_distribution_chart = new Chart($scope.stat_distribution_ctx).StackedBar($scope.stat_distribution_data, $scope.stat_distribution_options);

  $scope.build_blocks = [];
  $scope.current_block = {};
  $scope.createNewBlock();
  /*
  $scope.build_data = [
    [0, 10, 0, 30, 40, 50, 0, 70, 80, 90, 100]
  ];*/
});

function CombineStats(victory_stats, defeat_stats) {
  if (!victory_stats && !defeat_stats) {
    return null;
  } else if (!victory_stats) {
    return defeat_stats;
  } else if (!defeat_stats) {
    return victory_stats;
  }

  // Make a copy of our source stats so we don't end up changing anything
  victory_stats = JSON.parse(JSON.stringify(victory_stats));
  defeat_stats = JSON.parse(JSON.stringify(defeat_stats));

  var combined_stats = {};
  combined_stats.samples = victory_stats.samples + defeat_stats.samples;
  combined_stats.role = victory_stats.role;
  combined_stats.lane = victory_stats.lane;
  combined_stats.patch = victory_stats.patch;
  combined_stats.tier = victory_stats.tier;
  combined_stats.championId = victory_stats.championId;

  // trinketBuilds

  combined_stats.itemBuilds = victory_stats.itemBuilds;
  for (frame in defeat_stats.itemBuilds) {
      if (combined_stats.itemBuilds[frame]) {
          for (build in defeat_stats.itemBuilds[frame]) {
              if (combined_stats.itemBuilds[frame][build]) {
                  combined_stats.itemBuilds[frame][build] += defeat_stats.itemBuilds[frame][build];
              } else {
                  combined_stats.itemBuilds[frame][build] = defeat_stats.itemBuilds[frame][build];
              }
          }
      } else {
          combined_stats.itemBuilds[frame] = defeat_stats.itemBuilds[frame];
      }
  }

  // matchFrameData

  combined_stats.aggregateStats = victory_stats.aggregateStats;
  for (frame in defeat_stats.aggregateStats) {
      if (combined_stats.aggregateStats[frame]) {
          combined_stats.aggregateStats[frame].samples += defeat_stats.aggregateStats[frame].samples;
          combined_stats.aggregateStats[frame].kills += defeat_stats.aggregateStats[frame].kills;
          combined_stats.aggregateStats[frame].assists += defeat_stats.aggregateStats[frame].assists;
          combined_stats.aggregateStats[frame].deaths += defeat_stats.aggregateStats[frame].deaths;
      } else {
          combined_stats.aggregateStats[frame] = defeat_stats.aggregateStats[frame];
      }
  }

  return combined_stats;
}

app.controller('buildStatsCtrl', function($scope, $http, $timeout) {
  $scope.getNumber = function(num) {
    return new Array(num);   
  }

  $scope.parseStatCollection = function(stats_to_parse) {
    var stat_data = null;


    switch (stats_to_parse) {
      case 'victories':
        stat_data = $scope.current_stats.victories;
        $scope.current_victory = 'Victories';
        break;
      case 'defeats':
        stat_data = $scope.current_stats.defeats;
        $scope.current_victory = 'Defeats';
        break;
      case 'all':
        stat_data = CombineStats($scope.current_stats.victories, $scope.current_stats.defeats);
        $scope.current_victory = 'All Games';
        break;
    }

    if (stat_data) {
      var victories = 0;
      var defeats = 0;
      var total_games = 0;

      if ($scope.current_stats.victories) {
        victories = $scope.current_stats.victories.samples;
        total_games += victories;
      }
      if ($scope.current_stats.defeats) {
        defeats = $scope.current_stats.defeats.samples;
        total_games += defeats;
      }

      // Continuous flow effect
      //$scope.kda_chart.removeData();
      //$scope.kda_chart.addData([[], [], []], '');

      var champObject = $.grep($scope.champion_array, function(e){ return e.id == stat_data.championId; })[0];
      $scope.current_champion = champObject.name;
      $scope.current_tier = stat_data.tier;
      $scope.current_role = stat_data.role;
      $scope.current_lane = stat_data.lane;
      $scope.current_patch = stat_data.patch;
      $scope.current_winrate = (100*(victories/total_games)).toFixed(1);

      $scope.alert_current_match_message = $scope.current_champion + ' - ' +
                                           $scope.tiers[$scope.current_tier-1].name + ' - ' +
                                           $scope.current_victory + ' - ' +
                                           $scope.current_winrate + '% winrate - ' +
                                           $scope.current_role + ' - ' +
                                           $scope.current_lane + ' - ' +
                                           'Patch: ' + $scope.current_patch;
      $scope.alert_current_match = true;

      for (var i=0; i<=kda_timeline_length; i++) {
         $scope.kda_data.labels[i] = (i*5+'′ (0)');
         $scope.kda_chart.datasets[0].points[i].value = 0;
         $scope.kda_chart.datasets[1].points[i].value = 0;
         $scope.kda_chart.datasets[2].points[i].value = 0;
      }


      var killTally = 0;
      var deathTally = 0;
      var assistTally = 0
      
      for (var i = 0; i<stat_data.aggregateStats.length; i++) {
        killTally += stat_data.aggregateStats[i].kills;
        deathTally += stat_data.aggregateStats[i].deaths;
        assistTally += stat_data.aggregateStats[i].assists;
        if (!(i % kda_interval)) {
          var label_index = i/kda_interval;
          var frame_samples = stat_data.aggregateStats[i].samples;

          if (i <= kda_last_minute) {
            // This causes data to reset before tweening to next values, dig into ChartJS to see where it's
            // verifying the labels are the same
            $scope.kda_data.labels[label_index] = i+'′ ('+stat_data.aggregateStats[i].samples+')';
            $scope.kda_chart.datasets[0].points[label_index].value = (killTally/frame_samples).toFixed(2);
            $scope.kda_chart.datasets[1].points[label_index].value = (deathTally/frame_samples).toFixed(2);
            $scope.kda_chart.datasets[2].points[label_index].value = (assistTally/frame_samples).toFixed(2);

            killTally = 0;
            deathTally = 0;
            assistTally = 0;
          }
        }
      }

      $scope.kda_chart.update();

      $scope.item_builds = [];
      $scope.core_build = [];
      var idx = 0;
      var item_purchase_history = [];
      for (item_frame in stat_data.itemBuilds) {
        var frame_samples = stat_data.aggregateStats[idx*kda_interval].samples;
        // If item_frame > 50, break
        // Handle end game builds somehow

        // Fetch most popular Starting Build
        if (item_frame == 1) {
          var most_popular = {};
          most_popular.count = 0;
          for (build in stat_data.itemBuilds[item_frame]) {
            if (stat_data.itemBuilds[item_frame][build] > most_popular.count) {
              most_popular.count = stat_data.itemBuilds[item_frame][build];
              most_popular.idx = build;
            }
          }

          if (most_popular.idx) {
            $scope.start_build = {};
            $scope.start_build.items = [];
            $scope.start_build.count = most_popular.count;
            var split_build = most_popular.idx.split(':');
            split_build.pop();
            for (var i=0; i<split_build.length; i++) {
              var item_id = (split_build[i]%10000).toString();
              var quantity = Math.floor(split_build[i]/10000);
              
              for (var j=0; j<quantity; j++) {
                $scope.start_build.items.push(item_id);
              }

              item_purchase_history.push(item_id);
            }
          }
        }

        // Count most popular items per frame
        var build_frame = {};
        //build_frame.builds = [];
        var unsorted_item_count = {};

        for (item_build in stat_data.itemBuilds[item_frame]) {
          var split_build = item_build.split(':');
          split_build.pop();

          for (var i=0; i<split_build.length; i++) {
            var item_id = (split_build[i]%10000).toString();
            //var quantity = Math.floor(split_build[i]/10000);

            var including_subitems = [];
            including_subitems.push(item_id);
            var item_subitems = $scope.itemlist_json[item_id].from;
            for (subitem_idx in item_subitems) {
              including_subitems.push(item_subitems[subitem_idx]);
            }

            for (item_idx in including_subitems) {
              var curr_item_id =  including_subitems[item_idx];
              if (unsorted_item_count[curr_item_id]) {
                unsorted_item_count[curr_item_id] += stat_data.itemBuilds[item_frame][item_build];
              } else {
                unsorted_item_count[curr_item_id] = stat_data.itemBuilds[item_frame][item_build];
              }
            }
          }
        }

        var sorted_array = Object.keys(unsorted_item_count).sort(function(a,b){return unsorted_item_count[b]-unsorted_item_count[a]});
        var sorted_items = [];

        build_frame.significant_purchases = [];
        var subitem_history = [];
        for (item in sorted_array) {
          var this_item_id = sorted_array[item];
          var this_item_count = unsorted_item_count[this_item_id];
          var popularity = 100*(this_item_count/frame_samples);

          // Detailed sort stats
          //sorted_items.push({id: sorted_array[item], popularity: popularity});

          if (popularity > 50 &&
              item_purchase_history.indexOf(this_item_id) < 0) {
            // Record subitems of each parent item
            build_frame.significant_purchases.push({ id: this_item_id, popularity: Math.floor(popularity) });

            var from_items = $scope.itemlist_json[this_item_id].from;
            for (subitem in from_items) {
              if (subitem_history.indexOf(from_items[subitem]) < 0) {
                subitem_history.push(from_items[subitem]);
              }
            }

            item_purchase_history.push(this_item_id);

            if (item_frame > 1 &&
                $scope.core_build.length < 6 &&
                !$scope.itemlist_json[this_item_id].into) {
              $scope.core_build.push(this_item_id);
            }
          }
          
          if (popularity <= 50) {
            break;
          }
        }

        // Remove subitem if parent item is in this frame
        for (var i=0; i<build_frame.significant_purchases.length; i++) {
          if (subitem_history.indexOf(build_frame.significant_purchases[i].id) > -1) {
            build_frame.significant_purchases.splice(i,1);
            i--;
          }
        }

        build_frame.item_count = sorted_items;

  /*
        for (item_build in stat_data.itemBuilds[item_frame]) {
          var split_build = item_build.split(':');
          split_build.pop();

          var this_build_frame_build = {};
          this_build_frame_build.items = {};

          for (var i=0; i<split_build.length; i++) {
            var item_id = (split_build[i]%10000).toString();
            var quantity = Math.floor(split_build[i]/10000);
            this_build_frame_build.items[item_id] = quantity;
          }

          this_build_frame_build.count = stat_data.itemBuilds[item_frame][item_build];
          build_frame.builds.push(this_build_frame_build);
        }*/

        build_frame.samples = stat_data.aggregateStats[item_frame].samples;
        //console.log(build_frame);
        $scope.item_builds.push(build_frame);
        idx++;
      }
    }
  }

  $scope.getItemImage = function(item_id) {
    return GetItemImage($scope, item_id);
  }

  $scope.Math = Math;

  GetChampionJson($scope, $http);
  GetItemlistJson($scope, $http);

  $scope.search = {};
  $scope.search.championId = {};
  $scope.search.tier = {};
  $scope.search.position = {};

  $scope.alert_loading = false;
  $scope.alert_error = false;
  $scope.alert_current_match = false;

  // KDA Chart
  $scope.kda_labels = [];
  for (var i=0; i<=kda_timeline_length; i++) {
      $scope.kda_labels.push(i*5+'′ (0)');
  }

  var kda_datasets =  [{
                          label: "Kills",
                          fillColor: "rgba(70,200,70,0.05)",
                          strokeColor: "rgba(70,200,70,1)",
                          pointColor: "rgba(70,200,70,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(70,200,70,0.8)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Deaths",
                          fillColor: "rgba(247,70,74,0.05)",
                          strokeColor: "rgba(247,70,74,1)",
                          pointColor: "rgba(247,70,74,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(247,70,74,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Assists",
                          fillColor: "rgba(151,187,205,0.05)",
                          strokeColor: "rgba(151,187,205,1)",
                          pointColor: "rgba(151,187,205,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(151,187,205,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       }];

  $scope.kda_data = { labels: $scope.kda_labels,
                      datasets: kda_datasets };

  $scope.kda_options = {
    scaleOverride: true,
    scaleSteps: 10,
    scaleStepWidth: 1,
    scaleStartValue: 0,
    scaleFontSize: 18,
    scaleFontColor: "#DDDDDD"
  };

  $scope.kda_ctx = document.getElementById("kdaChart").getContext("2d");
  $scope.kda_chart = new Chart($scope.kda_ctx).Line($scope.kda_data, $scope.kda_options);

  $scope.tiers = [ { id: 1, name: 'Bronze',     image:'./images/tier_icons/bronze.png' },
                   { id: 2, name: 'Silver',     image:'./images/tier_icons/silver.png' },
                   { id: 3, name: 'Gold',       image:'./images/tier_icons/gold.png' },
                   { id: 4, name: 'Platinum',   image:'./images/tier_icons/platinum.png' },
                   { id: 5, name: 'Diamond',    image:'./images/tier_icons/diamond.png' },
                   { id: 6, name: 'Master',     image:'./images/tier_icons/master.png' },
                   { id: 7, name: 'Challenger', image:'./images/tier_icons/challenger.png' } ];

  $scope.positions = [ 'Top',
                       'Jungle',
                       'Mid',
                       'Bottom',
                       'Most Popular Lane' ];

  $scope.randomSearch = function() {
    if (!$scope.alert_loading) {
      $scope.search.championId.selected = $scope.champion_array[$scope.random_champ_idx];
      $scope.search.tier.selected = $scope.tiers[$scope.random_tier_idx];
      $scope.search.position.selected = $scope.positions[$scope.random_lane_idx];
      $scope.submit();
      SetRandoms($scope);
    }
  }

  $scope.loadPrevious = function() {
    if ( $scope.previous_stats ) {
      parseStatCollection( $scope.previous_stats );
    }
  }

  $scope.submit = function() {
    delete $scope.victory_response;
    delete $scope.defeat_response;

    $scope.alert_error = false;

    if (!$scope.search.championId.selected) {
      $scope.alert_error = true;
      $scope.alert_error_message = 'Please at least select a champion';
      return;
    }

    var championId = $scope.search.championId.selected.id;
    var tier = $scope.search.tier.selected.id;
    var position = $scope.search.position.selected;

    $scope.alert_loading = true;

    $http.get('/stat_collections?championId='+championId+
              '&tier='+tier+
              '&position='+position)
      .then(function(res){
        //$scope.previous_stats = $scope.current_stats;
        $scope.current_stats = res.data;
        $scope.parseStatCollection( 'all' );
        $scope.alert_loading = false;
      }, function(res){
        $scope.alert_error = true;
        $scope.alert_loading = false;

        if (res.status == 404) {
          $scope.alert_error_message = 'Sorry, no champion data for that search.'
        } else {
          $scope.alert_error_message = 'Status Code '+res.status+': '+res.data;
        }
        // 404 / Error Handling
      });
  };

  /*
  $scope.kda_click = function () {
    if ($scope.displayed) {
      if ($scope.displayed == 'Victory' && $scope.defeat_response) {
        parseStatCollection( $scope.defeat_response );
        $scope.displayed = 'Defeat';
      } else if ($scope.displayed == 'Defeat' && $scope.victory_response) {
        parseStatCollection ( $scope.victory_response );
        $scope.displayed = 'Victory';
      }
    };
  };
  */
});