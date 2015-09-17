var app = angular.module('coreApp', ['chart.js','ui.select','ngSanitize','ui.bootstrap','angular-bind-html-compile','popoverToggle']);

var ddragon_url = 'http://ddragon.leagueoflegends.com/cdn/5.16.1/';
var ddragon_item_img_url = ddragon_url+'img/item/';

var kda_interval = 5;
var kda_last_minute = 50;
var kda_timeline_length = kda_last_minute / kda_interval // 5 minute intervals up to 60

var qty_item_id_constant = 10000;

var BLOCK_SIZE = 6;
var BOOTS_OF_SPEED_ID = "1001";

// Lightweight item object created from the full Itemlist JSON
function ItemlistEntry(id, name, cost, image, plaintext) {
  this.id = id;
  this.name = name;
  this.cost = cost;
  this.image = image;
  this.plaintext = plaintext;
  return this;
}

// Calculates random search terms, used underneath title of "champion" page
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

// Retrieves champion JSON file
function GetChampionJson($scope, $http, callback) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      // Create a champion_array since it's easier for ui-select to digest
      $scope.champion_array = [];
      $scope.champion_json = res.data.data;

      // Sort the champion keys in alphabetical order
      var sorted_champions = Object.keys($scope.champion_json).sort(function(a,b){return $scope.champion_json[a].name.localeCompare($scope.champion_json[b].name);});
      for (champ in sorted_champions) {
        var champ_json = $scope.champion_json[sorted_champions[champ]];
        champ_json.image = ddragon_url+'img/champion/'+champ_json.key+'.png';
        $scope.champion_array.push(champ_json);
      }

      // Trigger callback if we were passed one
      if (callback) {
        callback($scope);
      }
    });
}

// Retrieves itemlist JSON file
function GetItemlistJson($scope, $http, callback) {
  $http.get('/static-json/itemlist.json')
  .then(function(res){
    // Create itemlist_array since it's easier for ui-select to digest
    $scope.itemlist_array = [];
    $scope.item = {};
    $scope.itemlist_json = res.data.data;
    for (item in $scope.itemlist_json) {
      // Use ItemlistEntry to slim down the original JSON object
      $scope.itemlist_array.push( new ItemlistEntry( $scope.itemlist_json[item].id,
                                                     $scope.itemlist_json[item].name,
                                                     $scope.itemlist_json[item].gold.total,
                                                     ddragon_item_img_url+$scope.itemlist_json[item].id+'.png',
                                                     $scope.itemlist_json[item].plaintext ));
    }

    // Trigger callback if we were passed one
    if (callback) {
      callback($scope);
    }
  });
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

// Main controller for the item page
app.controller('statDistributionCtrl', function($scope, $http, $timeout, $location) {
  $scope.loadItemset = function() {
    // Check for the build MD5 hash in the URL parameters (e.g. /#?b=XXX)
    if ($location.search().b) {
      $http.get('/linkify?b='+$location.search().b)
        .then(function(res){
          if (res.data) {
            // If we get data returned, pass it along to the itemset processor
            $scope.processItemset(res.data)
          }
        }, function(res){
          // 404 / Error Handling
        });
    }
  }

  $scope.uploadItemset = function(element) {
    var reader = new FileReader();

    reader.onload = function(e) {
      var itemsetJson = JSON.parse(reader.result);
      var newItemset = {};
      newItemset.name = itemsetJson.title;
      newItemset.blocks = [];

      for (block in itemsetJson.blocks) {
        var blockItems = [];
        for (item in itemsetJson.blocks[block].items) {
          blockItems.push(itemsetJson.blocks[block].items[item].id);
        }
        newItemset.blocks.push({ name: itemsetJson.blocks[block].type,
                                 items: blockItems });
      }
      $scope.processItemset(newItemset);
      $scope.$digest();
    }

    reader.readAsText(element.files[0]);
  }

  $scope.loadRandomItems = function() {
    var randomItemset = {};
    randomItemset.name = 'Random Item Set';
    randomItemset.blocks = [];
    var block_items = [];

    for (var i=0; i<BLOCK_SIZE; i++) {
      var random_item = $scope.itemlist_array[Math.round(Math.random()*($scope.itemlist_array.length-1))];

      if (!random_item.into) {
        block_items.push(random_item.id);
      } else {
        i--;
      }
    }

    randomItemset.blocks.push({ name: 'Random',
                                items: block_items });

    $scope.processItemset(randomItemset);
  }

  // Save loaded itemset to the local scope variables and load the first block
  $scope.processItemset = function(data) {
    $scope.item_set_name = data.name;

    if (data.blocks) {
      $scope.build_blocks = data.blocks;

      $scope.loadBlock($scope.build_blocks[0]);
    }
  }

  // Simple function so that we iterate over a set number in angular
  $scope.getNumber = function(num) {
    return new Array(num);   
  }

  // Get the total cost of each item currently selected
  $scope.getTotalCost = function() {
    return $scope.actual_cost.reduce(function(prevValue, curValue){
      return prevValue + curValue;
    });
  }

  // Get the total effective gold of each item currently selected
  $scope.getEffectiveGold = function() {
    return $scope.effective_gold.reduce(function(prevValue, curValue){
      return prevValue + curValue;
    });
  }

  // Get the total % efficiency using the cost and effective gold
  $scope.getTotalEfficiency = function() {
    var efficiency = Math.round(100*($scope.getEffectiveGold()/$scope.getTotalCost()));
    return efficiency ? efficiency : 0;
  }

  // Get the total stat value for the block
  $scope.getTotalStat = function(index) {
    var stat_total = 0;
    for (var i=0; i<$scope.stat_tally.length; i++) {
      stat_total += $scope.stat_tally[i][index];
    }
    return stat_total;
  }

  /*
  $scope.getStatFromCost = function(cost, index) {
    return Math.round(cost/$scope.stat_distribution_stat_bases[index]);
  }*/

  $scope.deleteItem = function(item_slot) {
    $scope.build_blocks[$scope.current_block].items[item_slot] = null;
    $scope.build_item_image[item_slot] = '//:0';
    $scope.clearItem(item_slot);
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
    $scope.stat_distribution_chart.update();
    delete $scope.build_item[item_slot].selected;
  }

  $scope.item_img_url = ddragon_item_img_url;

  $scope.scrapeItemDescription = function(description, stat_tally, jungle_enchant) {
    var armorPenetration = description.indexOf("Armor Penetration");
    var lifeSteal = description.indexOf("Life Steal");
    var baseHealthRegen = description.indexOf("Base Health Regen");
    var baseManaRegen = description.indexOf("Base Mana Regen");
    var cooldownReduction = description.indexOf("Cooldown Reduction");
    var magicPenetration = description.indexOf("Magic Penetration");

    if (armorPenetration > -1) {
      stat_tally[1] += parseInt(description.slice(armorPenetration-3, armorPenetration-1)) || 0;
    }
    if (lifeSteal > -1) {
      stat_tally[2] += parseInt(description.slice(lifeSteal-4, lifeSteal).split('%')[0]) || 0;
    }
    if (baseHealthRegen > -1) {
      stat_tally[7] += parseInt(description.slice(baseHealthRegen-5, baseHealthRegen).split('%')[0]) || 0;
    }
    if (baseManaRegen > -1) {
      stat_tally[12] += parseInt(description.slice(baseManaRegen-5, baseManaRegen).split('%')[0]) || 0;
    }
    if (cooldownReduction > -1) {
      stat_tally[13] += parseInt(description.slice(cooldownReduction-4, cooldownReduction).split('%')[0]) || 0;
    }
    if (magicPenetration > -1) {
      stat_tally[14] += parseInt(description.slice(magicPenetration-3, magicPenetration-1)) || 0;
    }


    if (jungle_enchant) {
      var attackDamage = description.indexOf("Attack Damage");
      var attackSpeed = description.indexOf("Attack Speed");
      var abilityPower = description.indexOf("Ability Power");
      var mana = description.indexOf("Mana");
      var health = description.indexOf("Health");

      stat_tally[0] += parseInt(description.slice(attackDamage-3, attackDamage-1)) || 0;
      stat_tally[3] += parseInt(description.slice(attackSpeed-4, attackSpeed-1).split('%')[0]) || 0;
      stat_tally[6] += parseInt(description.slice(health-4, health-1)) || 0;
      stat_tally[11] += parseInt(description.slice(mana-4, mana-1)) || 0;
      stat_tally[15] += parseInt(description.slice(abilityPower-3, abilityPower-1)) || 0;
    }
  }

  $scope.itemChange = function(item_slot, item_id) {
    $scope.build_blocks[$scope.current_block].items[item_slot] = item_id;
    $scope.loadItem(item_slot, item_id);
  }

  $scope.loadItem = function(item_slot, item_id) {
    var this_item = $scope.itemlist_json[item_id];
    var datasets = $scope.stat_distribution_data.datasets;
    var this_stat_tally = $scope.stat_tally[item_slot];

    // Reset stat tally for new item, the last index contains a boolean for passives
    for (var i=0; i<$scope.stat_distribution_stat_bases.length+1; i++) {
      this_stat_tally[i] = 0;
    }

    datasets[item_slot].label = this_item.name;

    var enchantment = this_item.name.indexOf("Enchantment") > -1;
    var jungle_enchant = (this_item.group == "JungleItems") && enchantment;

    if (!jungle_enchant) {
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
    }

    var sanitizedDescription = $scope.itemlist_json[item_id].sanitizedDescription;
    $scope.scrapeItemDescription(sanitizedDescription, this_stat_tally, jungle_enchant);

    // Make a note when displaying the gold efficiency that this item has hidden value
    if (sanitizedDescription.indexOf("Passive") > -1 ||
        sanitizedDescription.indexOf("Active") > -1 ||
        sanitizedDescription.indexOf("Aura") > -1) {
      this_stat_tally[16] = 1;
    }

    // For enchantments, since the description changes we can't simply parse it for these special stats.  Instead,
    // we need to load the item it was built from and scrape that for any stat values as well.
    if (enchantment && !jungle_enchant) {
      var subItemId = $scope.itemlist_json[item_id].from[0];
      var subitemDescription = $scope.itemlist_json[subItemId].sanitizedDescription;

      // check group.JungleItems
      $scope.scrapeItemDescription(subitemDescription, this_stat_tally);
    }

    // Get "Effective Gold" stat
    var total_effective_gold = 0;
    for (var i=0; i<$scope.stat_distribution_label_keys.length; i++)
    {
      $scope.stat_distribution_data.datasets[item_slot].data[i] = Math.floor(this_stat_tally[i]*
                                                                             $scope.stat_distribution_stat_bases[i]);
      total_effective_gold += $scope.stat_distribution_data.datasets[item_slot].data[i];
    }

    $scope.actual_cost[item_slot] = this_item.gold.total;
    $scope.effective_gold[item_slot] = total_effective_gold;

    $scope.stat_distribution_chart.update();
    $scope.build_item_image[item_slot] = $scope.item_img_url+item_id+'.png';

    $scope.build_item[item_slot].selected = new ItemlistEntry(item_id,
                                                              this_item.name,
                                                              this_item.gold.total,
                                                              $scope.build_item_image[item_slot],
                                                              this_item.plaintext);

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
    $scope.build_blocks.push({name: 'Untitled', items: []});
    var bb_length = $scope.build_blocks.length;
    $scope.loadBlock($scope.build_blocks[bb_length-1]);
    $scope.current_block = bb_length-1;
  }

  $scope.copyNewBlock = function() {
    $scope.build_blocks.push(JSON.parse(JSON.stringify($scope.build_blocks[$scope.current_block])));
    var bb_length = $scope.build_blocks.length;
    $scope.loadBlock($scope.build_blocks[bb_length-1]);
    $scope.current_block = bb_length-1;
  }

  $scope.renameItemSet = function() {
    $scope.currently_renaming_itemset = false;
  }

  $scope.startRenamingBlock = function() {
    $scope.currently_renaming_block = true;
    $scope.new_block_name = $scope.build_blocks[$scope.current_block].name;

    $timeout(function(){
      angular.element('#rename-input-box').select();
    });
  }

  $scope.renameBlock = function(block, new_name) {
    block.name = new_name;
    $scope.currently_renaming_block = false;
  }

  $scope.deleteBlock = function(block) {
    $scope.build_blocks.splice($scope.current_block,1);
    var bb_length = $scope.build_blocks.length;

    if ($scope.build_blocks.length > 0) {
      $scope.loadBlock($scope.build_blocks[bb_length-1]);
    } else {
      $scope.createNewBlock();
    }
  }

  $scope.loadBlock = function(block) {
    if (block) {
      if (block.items) {
        for(var i=0; i<BLOCK_SIZE; i++) {
          if (block.items[i] != undefined &&
              block.items[i] > 0) {
            $scope.loadItem(i, block.items[i])
          } else {
            $scope.clearItem(i)
          }
        }
      }
    }
  }

  $scope.shareItemSet = function() {
    $scope.currently_saving = true;
    var save_object = {};
    save_object.name = $scope.item_set_name;
    save_object.blocks = $scope.build_blocks;
    var parameter = JSON.stringify(save_object);
    $http.post('/linkify', parameter).
    success(function(data, status, headers, config) {
        $scope.share_link = 'http://item.builder.gg/#?b='+data;
        $scope.currently_saving = false;
      }).
      error(function(data, status, headers, config) {
        // Error saving item set
        $scope.currently_saving = false;
      });
  }

  $scope.exportItemSet = function() {
    var item_set = {};
    item_set.title = $scope.item_set_name;
    item_set.type = "custom";
    item_set.map = $scope.selected_map;
    item_set.mode = $scope.selected_game_mode;
    item_set.priority = false;
    item_set.sortrank = 0;
    item_set.blocks = [];

    for (var i=0; i<$scope.build_blocks.length; i++) {
      var block = {};
      block.type = $scope.build_blocks[i].name;
      /*
      block.recMath = false;
      block.minSummonerLevel = -1;
      block.maxSummonerLevel = -1;
      block.showIfSummonerSpell = "";
      block.hideIfSummonerSpell = "";
      */
      block.items = [];

      for (var j=0; j<$scope.build_blocks[i].items.length; j++) {
        if ($scope.build_blocks[i].items[j] != null) {
          block.items.push({ id: $scope.build_blocks[i].items[j].toString(),
                             count: 1 });
        }
      }

      item_set.blocks.push(block);
    }

    var content = JSON.stringify(item_set);
    var filename = $scope.item_set_name.split(' ').join('_');
    filename = filename.replace(/[|&;$%@"<>()+,]/g, "");
    var blob = new Blob([content], {type: "text/plain;charset=ansi"});
    saveAs(blob, filename+".json");
  }

  $scope.itemPopover = {
    templateUrl: 'itemPopoverTemplate.html'
  };

  $scope.show_help = false;
  $scope.Math = Math;

  $scope.build_item = [];

  for (var i=0; i<BLOCK_SIZE; i++) {
    $scope.build_item[i] = {};
  }

  $scope.currently_renaming_block = false;
  $scope.currently_renaming_itemset = false;

  $scope.item_set_name = 'Untitled Item Set';

  $scope.effective_gold = new Array(BLOCK_SIZE);
  $scope.actual_cost = new Array(BLOCK_SIZE);

  GetItemlistJson($scope, $http, $scope.loadItemset);

  $scope.build_item_image = [];

  $scope.map_array = [ { id: 'any', name: 'Any Map' },
                       { id: 'SR', name: "Summoner's Rift" },
                       { id: 'HA', name: 'Howling Abyss' },
                       { id: 'TT', name: 'Twisted Treeline' },
                       { id: 'CS', name: 'Crystal Scar' } ];

  $scope.game_mode_array = [ { id: 'any', name: 'Any Game Mode' },
                             { id: 'CLASSIC', name: 'Classic' },
                             { id: 'ARAM', name: 'ARAM' },
                             { id: 'ODIN', name: 'Dominion'} ];

  // Stat Distribution Chart Setup
  $scope.stat_distribution_label_values = ["Attack Damage",
                                           "Armor Penetration",
                                           "Lifesteal %",
                                           "Attack Speed %",
                                           "Critical Chance %",
                                           "Magic Resistance",
                                           "Health Points",
                                           "Health Regeneration %",
                                           "Armor",
                                           "Movespeed",
                                           "Movespeed %",
                                           "Mana",
                                           "Mana Regeneration %",
                                           "Cooldown Reduction %",
                                           "Magic Penetration",
                                           "Ability Power" ];

  $scope.percent_suffix_indexes = [ 2,
                                    3,
                                    4,
                                    7,
                                    10,
                                    12,
                                    13 ];

  $scope.stat_distribution_label_keys = ["\uf05b", // AD
                                         "\uf127", // ArPen
                                         "\uf0ec", // Lifesteal
                                         "\uf151", // AS
                                         "\uf0e7", // Crit Chance
                                         "\uf070", // MR
                                         "\uf004", // HP
                                         "\uf0fa", // HP%
                                         "\uf132", // Armor
                                         "\uf101", // Movespeed
                                         "\uf101%", // Movespeed %
                                         "\uf219", // Mana
                                         "\uf0d0", // Mana Regeneration %
                                         "\uf017", // Cooldown Reduction %
                                         "\uf0c4", // Magic Penetration
                                         "\uf06e" ]; // Ability Power
  $scope.stat_distribution_labels = $scope.stat_distribution_label_keys.slice();

  // Stat bases are calculated according to here: http://leagueoflegends.wikia.com/wiki/Gold_efficiency
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
                                          34.33, // Magic Pen
                                          21.75  // AP
                                        ];

  $scope.stat_tally = [];
  for(var i=0; i<BLOCK_SIZE; i++) {
    $scope.stat_tally[i] = [];
    for (var j=0; j<$scope.stat_distribution_label_keys.length; j++) {
      $scope.stat_tally[i][j] = 0;
    }
  }

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
                                       scaleFontSize: 18,
                                       scaleFontColor: "#DDDDDD",
                                       scaleGridLineColor : "rgba(255,255,255,.15)",
                                       scaleShowVerticalLines: false,
                                       responsive: true,
                                       scaleFontFamily: 'FontAwesome',
                                       tooltipTitleFontFamily: 'FontAwesome',
                                       /*
                                       scaleOverride: true,
                                       scaleSteps: 9,
                                       scaleStepWidth: 2000,
                                       scaleStartValue: 0*/ };

  $scope.stat_distribution_data = { labels: $scope.stat_distribution_labels,
                                    datasets: stat_distribution_datasets,
                                    pointLabelFontFamily: 'FontAwesome' };

  $scope.stat_distribution_ctx = document.getElementById("statDistributionChart").getContext("2d");
  $scope.stat_distribution_chart = new Chart($scope.stat_distribution_ctx).StackedBar($scope.stat_distribution_data, $scope.stat_distribution_options);

  $scope.build_blocks = [];
  $scope.current_block = 0;
  $scope.createNewBlock();
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

function CombineAggregateStats(victory_agg_stats, defeat_agg_stats) {
  if (!victory_agg_stats && !defeat_agg_stats) {
    return null;
  } else if (!victory_agg_stats) {
    return defeat_agg_stats;
  } else if (!defeat_agg_stats) {
    return victory_agg_stats;
  }

  // Make a copy of our source stats so we don't end up changing anything
  victory_agg_stats = JSON.parse(JSON.stringify(victory_agg_stats));
  defeat_agg_stats = JSON.parse(JSON.stringify(defeat_agg_stats));

  var combined_agg_stats = {};
  combined_agg_stats.aggregateStats = victory_agg_stats.aggregateStats;
  for (frame in defeat_agg_stats.aggregateStats) {
      if (combined_agg_stats.aggregateStats[frame]) {
          combined_agg_stats.aggregateStats[frame].totalKills += defeat_agg_stats.aggregateStats[frame].totalKills;
          combined_agg_stats.aggregateStats[frame].totalAssists += defeat_agg_stats.aggregateStats[frame].totalAssists;
          combined_agg_stats.aggregateStats[frame].totalDeaths += defeat_agg_stats.aggregateStats[frame].totalDeaths;
          combined_agg_stats.aggregateStats[frame].totalSamples += defeat_agg_stats.aggregateStats[frame].totalSamples;
        /*
          combined_agg_stats.aggregateStats[frame].totalKills = combined_agg_stats.aggregateStats[frame].totalKills.concat(defeat_agg_stats.aggregateStats[frame].totalKills);
          combined_agg_stats.aggregateStats[frame].totalAssists = combined_agg_stats.aggregateStats[frame].totalAssists.concat(defeat_agg_stats.aggregateStats[frame].totalAssists);
          combined_agg_stats.aggregateStats[frame].totalDeaths = combined_agg_stats.aggregateStats[frame].totalDeaths.concat(defeat_agg_stats.aggregateStats[frame].totalDeaths);
          combined_agg_stats.aggregateStats[frame].totalKDA = combined_agg_stats.aggregateStats[frame].totalKills.concat(defeat_agg_stats.aggregateStats[frame].totalKDA);
      */
      } else {
          combined_agg_stats.aggregateStats[frame] = defeat_agg_stats.aggregateStats[frame];
      }
  }

  return combined_agg_stats;
}

function GetPercentile(value, dataset, remove_zeros) {
  // In the case where we have 0, figure out how many zero values start out
  // the data set, and take the middle index of those
  var last_zero_index = dataset.lastIndexOf(0);
  if (value == 0) {
    var middle_zero_index = Math.floor(last_zero_index/2);
    return Math.round((middle_zero_index / dataset.length)*100);
  }

  if (remove_zeros != undefined && remove_zeros) {
    dataset = dataset.slice(last_zero_index+1,dataset.length); // If we only want to consider non-zero datasets
  }

  for (var i=0; i<dataset.length; i++) {
    if (value <= dataset[i]) {
      return Math.round((i / dataset.length)*100);
    }
  }

  return 50;
}

function GetKDA(kills, deaths, assists) {
  return (kills+assists)/(deaths < 1 ? 1 : deaths); // <1 deaths shouldn't skyrocket your KDA
}

app.controller('buildStatsCtrl', function($scope, $http, $timeout, $sce) {
  $scope.getNumber = function(num) {
    return new Array(num);   
  }

  $scope.getItemBuilderLink = function() {
    var parameter = {};
    parameter.name = $scope.current_champion.name + ' ' + $scope.current_lane;
    parameter.blocks = [];
    parameter.champId = $scope.current_champion.id;

    var core_block = {};
    core_block.name = 'Core Build';
    core_block.items = [];
    for (var i=0; i<$scope.core_build.length; i++) {
      core_block.items.push(parseInt($scope.core_build[i]));
    }
    parameter.blocks.push(core_block);
    $scope.currently_saving = true;

    $http.post('/linkify', parameter).
      success(function(data, status, headers, config) {
          $scope.item_builder_link = 'http://item.builder.gg/#?b='+data;
          $scope.item_builder_link_textbox = $scope.item_builder_link;
          $scope.currently_saving = false;
        }).
        error(function(data, status, headers, config) {
          // Error saving item set
          $scope.currently_saving = false;
        });
  }

  $scope.parseStatCollection = function(display_subset) {
    SetRandoms($scope);

    var stat_data = null;
    var aggregate_data = null;
    delete $scope.item_builder_link;

    switch (display_subset) {
      case 'victories':
        stat_data = $scope.current_stats.victories;
        aggregate_data = $scope.current_stats.victories_aggregate_kda;
        break;
      case 'defeats':
        stat_data = $scope.current_stats.defeats;
        aggregate_data = $scope.current_stats.defeats_aggregate_kda;
        break;
      case 'all':
        stat_data = CombineStats($scope.current_stats.victories, $scope.current_stats.defeats);
        aggregate_data = CombineAggregateStats($scope.current_stats.victories_aggregate_kda, $scope.current_stats.defeats_aggregate_kda);
        break;
    }

/*
    if (aggregate_data != null) {
      for (var i=0; i<aggregate_data.aggregateStats.length; i++) {
        aggregate_data.aggregateStats[i].totalKills.sort();
        aggregate_data.aggregateStats[i].totalAssists.sort();
        aggregate_data.aggregateStats[i].totalDeaths.sort();
        aggregate_data.aggregateStats[i].totalKDA.sort();
      }

      $scope.percentile_chart_available = true;
    } else {
      $scope.display_comparison_chart = false;
      $scope.percentile_chart_available = false;
    }
*/

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
      $scope.current_champion = champObject;
      $scope.current_tier = stat_data.tier;
      $scope.current_role = toTitleCase(stat_data.role.replace('_',' '));
      $scope.current_lane = toTitleCase(stat_data.lane);
      $scope.current_patch = stat_data.patch;
      $scope.current_winrate = (100*(victories/total_games)).toFixed(1);
      $scope.current_total_games = total_games;

      $scope.current_kda_deltas = [];

      for (var i=0; i<=kda_timeline_length; i++) {
         $scope.kda_chart.datasets[0].points[i].value = null;
         $scope.kda_chart.datasets[1].points[i].value = null;
         $scope.kda_chart.datasets[2].points[i].value = null;
         $scope.kda_chart.datasets[3].points[i].value = null;
         $scope.kda_chart.datasets[4].points[i].value = null;

         $scope.kda_aggregate_chart.datasets[0].points[i].value = null;
         $scope.kda_aggregate_chart.datasets[1].points[i].value = null;
         $scope.kda_aggregate_chart.datasets[2].points[i].value = null;
         $scope.kda_aggregate_chart.datasets[3].points[i].value = null;
         $scope.kda_aggregate_chart.datasets[4].points[i].value = null;
      }

      var killTally = 0;
      var deathTally = 0;
      var assistTally = 0
      var lastKDA = 0;

      var killAggregateTally = 0;
      var deathAggregateTally = 0;
      var assistAggregateTally = 0;

      var lastAggregateKDA = 0;

/*
      var percentileKillTally = [];
      var percentileDeathTally = [];
      var percentileAssistTally = [];
      var percentileKDATally = [];
*/

      for (var i = 0; i<stat_data.aggregateStats.length; i++) {
        var frame_samples = stat_data.aggregateStats[i].samples;

        var currentKills = stat_data.aggregateStats[i].kills/frame_samples;
        var currentDeaths = stat_data.aggregateStats[i].deaths/frame_samples;
        var currentAssists = stat_data.aggregateStats[i].assists/frame_samples;
        var currentKDA = GetKDA(currentKills, currentDeaths, currentAssists);

        killTally += currentKills;
        deathTally += currentDeaths;
        assistTally += currentAssists;

        killAggregateTally += aggregate_data.aggregateStats[i].totalKills / aggregate_data.aggregateStats[i].totalSamples;
        deathAggregateTally += aggregate_data.aggregateStats[i].totalDeaths / aggregate_data.aggregateStats[i].totalSamples;
        assistAggregateTally += aggregate_data.aggregateStats[i].totalAssists / aggregate_data.aggregateStats[i].totalSamples;

/*
        if (i > 0 && aggregate_data != null && aggregate_data.aggregateStats[i] != undefined) {
          percentileKillTally.push(GetPercentile(currentKills, aggregate_data.aggregateStats[i].totalKills));
          percentileDeathTally.push(GetPercentile(currentDeaths, aggregate_data.aggregateStats[i].totalDeaths));
          percentileAssistTally.push(GetPercentile(currentAssists, aggregate_data.aggregateStats[i].totalAssists));
          percentileKDATally.push(GetPercentile(currentKDA, aggregate_data.aggregateStats[i].totalKDA));
        } else {
          percentileKillTally.push(50);
          percentileDeathTally.push(50);
          percentileAssistTally.push(50);
          percentileKDATally.push(50);
        }
        */

        if (!(i % kda_interval)) {
          var label_index = i/kda_interval;

          if (i <= kda_last_minute) {
            //var middle_index = Math.floor(percentileKillTally.length / 2);

            var kills = killTally;
            var deaths = deathTally;
            var assists = assistTally;
            var kda = GetKDA(kills, deaths, assists);
            var aggregateKDA = GetKDA(killAggregateTally, deathAggregateTally, assistAggregateTally);

            // Sort so we can easily find the median
            /*
            percentileKillTally.sort();
            percentileDeathTally.sort();
            percentileAssistTally.sort();
            percentileKDATally.sort();
            */

            $scope.current_kda_deltas.push(kda.toFixed(2)-lastKDA);

            $scope.kda_chart.datasets[0].points[label_index].value = kda.toFixed(2);
            $scope.kda_chart.datasets[1].points[label_index].value = kills.toFixed(2);
            $scope.kda_chart.datasets[2].points[label_index].value = deaths.toFixed(2);
            $scope.kda_chart.datasets[3].points[label_index].value = assists.toFixed(2);
            $scope.kda_chart.datasets[4].points[label_index].value = frame_samples;

            $scope.kda_aggregate_chart.datasets[0].points[label_index].value = aggregateKDA == 0 ? 0 : Math.round(((kda-aggregateKDA)/aggregateKDA)*100);
            $scope.kda_aggregate_chart.datasets[1].points[label_index].value = killAggregateTally == 0 ? 0 : Math.round(((kills-killAggregateTally)/killAggregateTally)*100);
            $scope.kda_aggregate_chart.datasets[2].points[label_index].value = deathAggregateTally == 0 ? 0 : Math.round(((deaths-deathAggregateTally)/deathAggregateTally)*100);
            $scope.kda_aggregate_chart.datasets[3].points[label_index].value = assistAggregateTally == 0 ? 0 : Math.round(((assists-assistAggregateTally)/assistAggregateTally)*100);
            $scope.kda_aggregate_chart.datasets[4].points[label_index].value = frame_samples;
/*
            $scope.kda_aggregate_chart.datasets[0].points[label_index].value = Math.round(percentileKDATally[middle_index]);
            $scope.kda_aggregate_chart.datasets[1].points[label_index].value = Math.round(percentileKillTally[middle_index]);
            $scope.kda_aggregate_chart.datasets[2].points[label_index].value = 100-Math.round(percentileDeathTally[middle_index]); // Invert deaths since we want lower deaths
            $scope.kda_aggregate_chart.datasets[3].points[label_index].value = Math.round(percentileAssistTally[middle_index]);
*/
            lastKDA = kda.toFixed(2);

            killTally = 0;
            deathTally = 0;
            assistTally = 0;

            killAggregateTally = 0;
            deathAggregateTally = 0;
            assistAggregateTally = 0;

/*
            percentileKDATally = [];
            percentileKillTally = [];
            percentileDeathTally = [];
            percentileAssistTally = [];
            */
          }
        }
      }

      // Rehide any datasets that have been toggled off
      for (var i = 0; i < $scope.kda_chart.datasets.length; i++) {
        if ($scope.kda_chart.datasets[i].hidden) {
          delete $scope.kda_chart.datasets[i].hidden;
          $scope.toggleVisibility($scope.kda_chart, i, true);
        }
      }
      /*
      for (var i = 0; i < $scope.kda_aggregate_chart.datasets.length; i++) {
        if ($scope.kda_aggregate_chart.datasets[i].hidden) {
          delete $scope.kda_chart.datasets[i].hidden;
          $scope.toggleVisibility(i, true);
        }
      }
      */

      $scope.kda_chart.update();
      $scope.kda_aggregate_chart.update();

      // *** Item Processing ***
      $scope.item_builds = [];
      $scope.core_build = [];
      var idx = 0;
      var item_purchase_history = [];
      var boots_added = false;
      for (item_frame in stat_data.itemBuilds) {
        var frame_samples = stat_data.aggregateStats[idx*kda_interval].samples;

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
            var from_items = $scope.itemlist_json[this_item_id].from;
            for (subitem in from_items) {
              if (subitem_history.indexOf(from_items[subitem]) < 0) {
                subitem_history.push(from_items[subitem]);
              }
            }

            build_frame.significant_purchases.push({ id: this_item_id, popularity: Math.floor(popularity) });
            item_purchase_history.push(this_item_id);

            if (item_frame > 1) {
              var add_item = false;
              var upgrade_existing = -1;

              if (!$scope.itemlist_json[this_item_id].into) {
                for (from_item in from_items) {
                  var from_item_idx = $scope.core_build.indexOf(from_items[from_item]);
                  if (from_item_idx > -1) {
                    upgrade_existing = from_item_idx;
                  }
                }

                add_item = true;
              }

              if (from_items && from_items.indexOf(BOOTS_OF_SPEED_ID) > -1 && !boots_added) {
                add_item = true;
              }

              if (upgrade_existing > -1) {
                  $scope.core_build[upgrade_existing] = this_item_id;
              } else if (add_item && $scope.core_build.length < BLOCK_SIZE) {
                // check if from items are boots
                var is_boots = false;
                for (f_i in from_items) {
                  if ($scope.itemlist_json[from_items[f_i]].tags &&
                      $scope.itemlist_json[from_items[f_i]].tags.indexOf('Boots') > -1) {
                    is_boots = true;
                    break;
                  }
                }

                if (is_boots) {
                  if (boots_added) {
                    // Boots already added, don't add another pair
                    continue;
                  } else {
                    // First boots to be added, make sure to record
                    boots_added = true;
                  }
                }

                $scope.core_build.push(this_item_id);
              }
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

        build_frame.samples = stat_data.aggregateStats[item_frame].samples;
        $scope.item_builds.push(build_frame);
        idx++;
      }
    }
  }

  $scope.removeHiddenPoints = function(chart) {
    if ($scope.hiddenPointBuffer.length > 0) {
      var dataset = $scope.hiddenPointBuffer[0];
      $scope.hiddenPointBuffer.shift();
      for (var j=0; j<=kda_timeline_length; j++) {
        if (chart.datasets[dataset].points[j].hidden_value != null) {
          chart.datasets[dataset].points[j].value = null;
        }
      }
    }
  }

  $scope.toggleVisibility = function(chart, dataset, instant) {
    var already_hidden;

    if (chart.datasets[dataset].hidden != undefined) {
      already_hidden = true;
      delete chart.datasets[dataset].hidden;
    } else {
      already_hidden = false;
      chart.datasets[dataset].hidden = true;
      $scope.hiddenPointBuffer.push(dataset);
    }

    for (var i=0; i<=kda_timeline_length; i++) {
      if (already_hidden) {
        chart.datasets[dataset].points[i].value = chart.datasets[dataset].points[i].hidden_value;
        delete chart.datasets[dataset].points[i].hidden_value;
      } else {
        chart.datasets[dataset].points[i].hidden_value = chart.datasets[dataset].points[i].value;
        if (chart.datasets[dataset].points[i].value != null) {
          // If instant, do not animate
          if (instant) {
            chart.datasets[dataset].points[i].value = null;
          } else {
            chart.datasets[dataset].points[i].value = -chart.scale.max*2;
          }
        }
      }
    }

    chart.update();
  }

  $scope.item_img_url = ddragon_item_img_url;
  $scope.hiddenPointBuffer = [];

  $scope.show_help = false;
  $scope.Math = Math;

  GetChampionJson($scope, $http, SetRandoms);
  GetItemlistJson($scope, $http);

  $scope.itemPopover = {
    templateUrl: 'itemPopoverTemplate.html'
  };

  $scope.search = {};
  $scope.search.championId = {};
  $scope.search.tier = {};
  $scope.search.position = {};

  $scope.display_subset = 'all';
  $scope.display_comparison_chart = false;
  $scope.percentile_chart_available = true;

  $scope.alert_loading = false;
  $scope.alert_error = false;

  // KDA Chart
  $scope.kda_labels = [];
  for (var i=0; i<=kda_timeline_length; i++) {
      $scope.kda_labels.push(i*5+':00');
  }

  $scope.kda_ctx = document.getElementById("kdaChart").getContext("2d");

  var ratio_gradient = $scope.kda_ctx.createLinearGradient(0, -75, 0, 400);
  ratio_gradient.addColorStop(0, 'rgba(255,255,70,0.1)');
  ratio_gradient.addColorStop(1, 'rgba(255,255,70,0)');

  var kills_gradient = $scope.kda_ctx.createLinearGradient(0, -75, 0, 400);
  kills_gradient.addColorStop(0, 'rgba(70,200,70,0.2');
  kills_gradient.addColorStop(1, 'rgba(70,200,70,0)');

  var deaths_gradient = $scope.kda_ctx.createLinearGradient(0, -75, 0, 400);
  deaths_gradient.addColorStop(0, 'rgba(247,70,74,0.2)');
  deaths_gradient.addColorStop(1, 'rgba(247,70,74,0)');

  var assists_gradient = $scope.kda_ctx.createLinearGradient(0, -75, 0, 400);
  assists_gradient.addColorStop(0, 'rgba(151,187,205,0.1)');
  assists_gradient.addColorStop(1, 'rgba(151,187,205,0)');

  var kda_datasets =  [{
                          label: "KDA Ratio",
                          fillColor: ratio_gradient,
                          strokeColor: "rgba(255,255,70,0.5)",
                          pointColor: "rgba(255,255,70,0.5)",
                          pointStrokeColor: "rgba(255,255,70,0.5)",
                          pointHighlightFill: "rgba(255,255,70,1)",
                          pointHighlightStroke: "rgba(255,255,70,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Kills",
                          fillColor: kills_gradient,
                          strokeColor: "rgba(70,200,70,1)",
                          pointColor: "rgba(70,200,70,0.5)",
                          pointStrokeColor: "rgba(70,200,70,1)",
                          pointHighlightFill: "rgba(70,200,70,1)",
                          pointHighlightStroke: "rgba(70,200,70,0.8)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Deaths",
                          fillColor: deaths_gradient,
                          strokeColor: "rgba(247,70,74,1)",
                          pointColor: "rgba(247,70,74,0.5)",
                          pointStrokeColor: "rgba(247,70,74,1)",
                          pointHighlightFill: "rgba(247,70,74,1)",
                          pointHighlightStroke: "rgba(247,70,74,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Assists",
                          fillColor: assists_gradient,
                          strokeColor: "rgba(151,187,205,1)",
                          pointColor: "rgba(151,187,205,0.5)",
                          pointStrokeColor: "rgba(151,187,205,1)",
                          pointHighlightFill: "rgba(151,187,205,1)",
                          pointHighlightStroke: "rgba(151,187,205,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Sample Size",
                          fillColor: "rgba(0,0,0,0)",
                          strokeColor: "rgba(151,151,151,0.3)",
                          pointColor: "rgba(151,151,151,0)",
                          pointStrokeColor: "rgba(255,255,255,0)",
                          pointHighlightFill: "rgba(255,255,255,0)",
                          pointHighlightStroke: "rgba(151,151,151,0)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       }];

  $scope.kda_data = { labels: $scope.kda_labels,
                      datasets: kda_datasets };

  $scope.kda_options = {
    scaleOverride: true,
    scaleSteps: 5,
    scaleStepWidth: 1,
    scaleStartValue: 0,
    scaleFontSize: 18,
    scaleFontColor: "#DDDDDD",
    scaleShowGridLines : true,
    scaleGridLineColor : "rgba(255,255,255,.06)",
    scaleShowHorizontalLines: true,
    scaleShowVerticalLines: true,
    pointHitDetectionRadius : 30,
    onAnimationComplete: function(){ $scope.removeHiddenPoints($scope.kda_chart) },
    legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li class=\"legendItem\" ng-class=\"{grayed: kda_chart.datasets[<%=i%>].hidden}\" ng-click=\"toggleVisibility(kda_chart, <%=i%>)\"><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
  };

  $scope.kda_chart = new Chart($scope.kda_ctx).Line($scope.kda_data, $scope.kda_options);
  console.log($scope.kda_chart);
  $scope.kda_chart_legend = $sce.trustAsHtml($scope.kda_chart.generateLegend());

  // KDA Aggregate Chart
  $scope.kda_aggregate_ctx = document.getElementById("kdaAggregateChart").getContext("2d");
  $scope.kda_aggregate_labels = $scope.kda_labels;
  var kda_aggregate_datasets =  [{
                          label: "KDA Ratio",
                          fillColor: 'rgba(0,0,0,0)',
                          //fillColor: ratio_gradient,
                          strokeColor: "rgba(255,255,70,0.5)",
                          pointColor: "rgba(255,255,70,0.5)",
                          pointStrokeColor: "rgba(255,255,70,0.5)",
                          pointHighlightFill: "rgba(255,255,70,1)",
                          pointHighlightStroke: "rgba(255,255,70,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Kills",
                          fillColor: 'rgba(0,0,0,0)',
                          //fillColor: kills_gradient,
                          strokeColor: "rgba(70,200,70,1)",
                          pointColor: "rgba(70,200,70,0.5)",
                          pointStrokeColor: "rgba(70,200,70,1)",
                          pointHighlightFill: "rgba(70,200,70,1)",
                          pointHighlightStroke: "rgba(70,200,70,0.8)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Deaths",
                          fillColor: 'rgba(0,0,0,0)',
                          //fillColor: deaths_gradient,
                          strokeColor: "rgba(247,70,74,1)",
                          pointColor: "rgba(247,70,74,0.5)",
                          pointStrokeColor: "rgba(247,70,74,1)",
                          pointHighlightFill: "rgba(247,70,74,1)",
                          pointHighlightStroke: "rgba(247,70,74,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Assists",
                          fillColor: 'rgba(0,0,0,0)',
                          //fillColor: assists_gradient,
                          strokeColor: "rgba(151,187,205,1)",
                          pointColor: "rgba(151,187,205,0.5)",
                          pointStrokeColor: "rgba(151,187,205,1)",
                          pointHighlightFill: "rgba(151,187,205,1)",
                          pointHighlightStroke: "rgba(151,187,205,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Sample Size",
                          fillColor: "rgba(0,0,0,0)",
                          strokeColor: "rgba(151,151,151,0)",
                          pointColor: "rgba(151,151,151,0)",
                          pointStrokeColor: "rgba(255,255,255,0)",
                          pointHighlightFill: "rgba(255,255,255,0)",
                          pointHighlightStroke: "rgba(151,151,151,0)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Mean Performance",
                          fillColor: "rgba(0,0,0,0)",
                          strokeColor: "rgba(151,151,151,0.5)",
                          pointColor: "rgba(151,151,151,0)",
                          pointStrokeColor: "rgba(255,255,255,0)",
                          pointHighlightFill: "rgba(255,255,255,0)",
                          pointHighlightStroke: "rgba(151,151,151,0)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       }];
  $scope.kda_aggregate_data = { labels: $scope.kda_aggregate_labels,
                                datasets: kda_aggregate_datasets };
  $scope.kda_aggregate_options = {
    //scaleOverride: true,
    scaleIntegersOnly: true,
    scaleSteps: 4,
    scaleStepWidth: 50,
    scaleStartValue: -100,
    scaleFontSize: 18,
    scaleFontColor: "#DDDDDD",
    scaleShowGridLines : true,
    scaleGridLineColor : "rgba(255,255,255,.06)",
    scaleShowHorizontalLines: true,
    scaleShowVerticalLines: true,
    scaleLabel: "<%if(value>0){%>+<%}%><%=value%>%",
    pointHitDetectionRadius : 30,
    bezierCurveTension : 0.314,
    onAnimationComplete: function(){ $scope.removeHiddenPoints($scope.kda_aggregate_chart) },
    multiTooltipTemplate: "<%=datasetLabel%>: <%if(datasetLabel == 'Sample Size'){%><%= value %><% }else{ %><% if(value>0){ %>+<% } %><%= value %>%<% } %>",
    legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><%if(datasets[i].label != 'Sample Size'){%><li class=\"legendItem\" ng-class=\"{grayed: kda_aggregate_chart.datasets[<%=i%>].hidden}\" ng-click=\"toggleVisibility(kda_aggregate_chart, <%=i%>)\"><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%><%}%></ul>"
  };

  $scope.kda_aggregate_chart = new Chart($scope.kda_aggregate_ctx).Line($scope.kda_aggregate_data, $scope.kda_aggregate_options);

  $scope.kda_aggregate_chart_legend = $sce.trustAsHtml($scope.kda_aggregate_chart.generateLegend());

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

  $scope.patches = [ '5.17', '5.16' ];

  $scope.randomSearch = function() {
    if (!$scope.alert_loading) {
      $scope.search.championId.selected = $scope.champion_array[$scope.random_champ_idx];
      $scope.search.tier.selected = $scope.tiers[$scope.random_tier_idx];
      $scope.search.position.selected = $scope.positions[$scope.random_lane_idx];
      $scope.display_subset = 'all';
      $scope.submit();
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
    var patch = $scope.search.patch.selected;

    $scope.alert_loading = true;

    $http.get('/stat_collections?championId='+championId+
              '&tier='+tier+
              '&position='+position+
              '&patch='+patch)
      .then(function(res){
        //$scope.previous_stats = $scope.current_stats;
        $scope.current_stats = res.data;
        $scope.parseStatCollection($scope.display_subset);
        $scope.alert_loading = false;
      }, function(res){
        $scope.alert_error = true;
        $scope.alert_loading = false;

        if (res.status == 404) {
          $scope.alert_error_message = 'Sorry, no champion data for that search.'
        } else {
          $scope.alert_error_message = 'Status Code '+res.status+': '+res.data;
        }

        SetRandoms($scope);
      });
  };
});