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

function GetChampionJson($scope, $http) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      $scope.champion_array = [];
      $scope.champion_json = res.data.data;
      for (champ in $scope.champion_json) {
        var champ_json = $scope.champion_json[champ];
        champ_json.image = ddragon_url+'img/champion/'+champ_json.key+'.png';
        $scope.champion_array.push(champ_json);
      }

      //$scope.search.championId = $scope.champion_json['Katarina'].id;
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
    return ddragon_url+'img/item/'+$scope.itemlist_json[item_id].image.full;
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
    $scope.build_blocks.push({name: 'New Build', items: []});
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

  GetChampionJson($scope, $http);
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


app.controller('buildStatsCtrl', function($scope, $http, $timeout) {
  function parseStatCollection(stat_data) {
    // Continuous flow effect
    //$scope.kda_chart.removeData();
    //$scope.kda_chart.addData([[], [], []], '');

    var champObject = $.grep($scope.champion_array, function(e){ return e.id == stat_data.championId; })[0];
    $scope.current_champion = champObject.name;

    for (var i=0; i<=kda_timeline_length; i++) {
       $scope.kda_data.labels[i] = (i*5+' (0)');
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
          $scope.kda_data.labels[label_index] = i+' ('+stat_data.aggregateStats[i].samples+')';
          $scope.kda_chart.datasets[0].points[label_index].value = (killTally/frame_samples);
          $scope.kda_chart.datasets[1].points[label_index].value = (deathTally/frame_samples);
          $scope.kda_chart.datasets[2].points[label_index].value = (assistTally/frame_samples);

          killTally = 0;
          deathTally = 0;
          assistTally = 0;
        }
      }
    }

    $scope.kda_chart.update();

    $scope.item_builds = [];
    for (item_build in stat_data.itemBuilds) {
      $scope.item_builds.push(stat_data.itemBuilds[item_build]);
    }
  }

  GetChampionJson($scope, $http);
  GetItemlistJson($scope, $http);

  $scope.search = {};
  $scope.search.championId = {};
  $scope.search.tier = {};
  $scope.search.patch = {};

  // KDA Chart
  $scope.kda_labels = [];
  for (var i=0; i<=kda_timeline_length; i++) {
      $scope.kda_labels.push(i*5+' (0)');
  }

  var kda_datasets =  [{
                          label: "Kills",
                          fillColor: "rgba(70,200,70,0.02)",
                          strokeColor: "rgba(70,200,70,1)",
                          pointColor: "rgba(70,200,70,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(70,200,70,0.8)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Deaths",
                          fillColor: "rgba(247,70,74,0.02)",
                          strokeColor: "rgba(247,70,74,1)",
                          pointColor: "rgba(247,70,74,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(247,70,74,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Assists",
                          fillColor: "rgba(151,187,205,0.02)",
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

  $scope.patches = [ '5.15',
                     '5.14' ];

  $scope.submit = function() {
    delete $scope.victory_response;
    delete $scope.defeat_response;

    var championId = $scope.search.championId.selected.id;
    var tier = $scope.search.tier.selected.id;
    var patch = $scope.search.patch.selected;

    $http.get('/stat_collections?championId='+championId+
              '&tier='+tier+
              '&patch='+patch+
              '&victory=true')
      .then(function(res){
        $scope.victory_response = res.data;
        parseStatCollection( $scope.victory_response );
        $scope.displayed = 'Victory';
      }, function(res){
        // 404 / Error Handling
      });
    $http.get('/stat_collections?championId='+championId+
              '&tier='+tier+
              '&patch='+patch+
              '&victory=false')
      .then(function(res){
        $scope.defeat_response = res.data;
      }, function(res){
        // 404 / Error Handling
      });
  };

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
});