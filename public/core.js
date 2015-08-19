var app = angular.module('coreApp', ['chart.js','ui.select','ngSanitize']);

var kda_interval = 5;
var kda_last_minute = 50;
var kda_timeline_length = kda_last_minute / kda_interval // 5 minute intervals up to 60

var qty_item_id_constant = 10000;

function GetChampionJson($scope, $http) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      $scope.champion_array = [];
      $scope.champion_json = res.data.data;
      for (champ in $scope.champion_json) {
        $scope.champion_array.push($scope.champion_json[champ]);
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
      $scope.itemlist_array.push({ id: $scope.itemlist_json[item].id,
                                   name: $scope.itemlist_json[item].name });
    }
  });
}

app.controller('statDistributionCtrl', function($scope, $http, $timeout) {
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

  $scope.itemChange = function(item_slot, item_id) {
    var this_item = $scope.itemlist_json[item_id];
    var datasets = $scope.stat_distribution_data.datasets;

    datasets[item_slot].label = this_item.name;

    datasets[item_slot].data[0] =  this_item.stats.FlatHPPoolMod         ? this_item.stats.FlatHPPoolMod         : 0;
    datasets[item_slot].data[1] =  this_item.stats.FlatMPPoolMod         ? this_item.stats.FlatMPPoolMod         : 0;
    datasets[item_slot].data[2] =  this_item.stats.FlatArmorMod          ? this_item.stats.FlatArmorMod          : 0;
    datasets[item_slot].data[3] =  this_item.stats.FlatSpellBlockMod     ? this_item.stats.FlatSpellBlockMod     : 0;
    datasets[item_slot].data[4] =  this_item.stats.FlatPhysicalDamageMod ? this_item.stats.FlatPhysicalDamageMod : 0;
    datasets[item_slot].data[5] =  this_item.stats.FlatMagicDamageMod    ? this_item.stats.FlatMagicDamageMod    : 0;
    datasets[item_slot].data[6] =  this_item.stats.FlatHPRegenMod        ? this_item.stats.FlatHPRegenMod        : 0;
    datasets[item_slot].data[7] =  this_item.stats.FlatMPRegenMod        ? this_item.stats.FlatMPRegenMod        : 0;
    datasets[item_slot].data[8] =  this_item.stats.FlatCritChanceMod     ? this_item.stats.FlatCritChanceMod*100 : 0;
    datasets[item_slot].data[9] =  this_item.stats.PercentAttackSpeedMod ? this_item.stats.PercentAttackSpeedMod*100    : 0;
    datasets[item_slot].data[10] = this_item.stats.FlatMovementSpeedMod  ? this_item.stats.FlatMovementSpeedMod  : 0;

    // Get "Effective Gold" stat
    for (var i=0; i<11; i++)
      $scope.stat_distribution_data.datasets[item_slot].data[i] *= $scope.stat_distribution_stat_bases[i];

    // Update labels with stat amount
    for (var i=0; i<11; i++) {
      var total_stat = 0;
      for (var j=0; j<datasets.length; j++)
        total_stat += (datasets[j].data[i] / $scope.stat_distribution_stat_bases[i]);
      
      $scope.stat_distribution_data.labels[i] = $scope.stat_distribution_label_map[i]+' ('+total_stat+')';
    }


    $scope.stat_distribution_chart.update();
    $scope.build_item_image[item_slot] = 'http://ddragon.leagueoflegends.com/cdn/5.15.1/img/item/'+$scope.itemlist_json[item_id].image.full;

    /*
    $scope.stat_distribution_chart.destroy();
    $scope.stat_distribution_chart = new Chart($scope.stat_distribution_ctx).StackedBar($scope.stat_distribution_data);
    */

    var uiSelect = angular.element('#item'+item_slot+' .ui-select-container').controller('uiSelect');

    // Hide item selection box again
    $timeout(function() {
      uiSelect.focusser[0].blur();
      $scope.show_item_search = [];
      //uiSelect.open = true;
      //uiSelect.activate();
    });

    //console.log($scope.itemlist_json[item_id]);
  }

  GetChampionJson($scope, $http);
  GetItemlistJson($scope, $http);

  $scope.build_item_image = [];

  // Stat Distribution Chart Setup
  $scope.stat_distribution_label_map = ["HP", "Mana", "Armor", "MR", "AD", "AP", "Health Regen", "Mana Regen", "Crit Chance", "AS", "MS"];
  $scope.stat_distribution_labels = $scope.stat_distribution_label_map.slice();
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
  var stat_distribution_datasets =  [{
                            label: "N/A",
                            fillColor: "rgba(200,45,45,0.5)",
                            strokeColor: "rgba(200,45,45,1)",
                            pointColor: "rgba(200,45,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,45,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(200,200,45,0.5)",
                            strokeColor: "rgba(200,200,45,1)",
                            pointColor: "rgba(200,200,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,200,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,200,45,0.5)",
                            strokeColor: "rgba(45,200,45,1)",
                            pointColor: "rgba(45,200,45,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,200,45,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,200,200,0.5)",
                            strokeColor: "rgba(45,200,200,1)",
                            pointColor: "rgba(45,200,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,200,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(45,45,200,0.5)",
                            strokeColor: "rgba(45,45,200,1)",
                            pointColor: "rgba(45,45,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(45,45,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         },
                         {
                            label: "N/A",
                            fillColor: "rgba(200,45,200,0.5)",
                            strokeColor: "rgba(200,45,200,1)",
                            pointColor: "rgba(200,45,200,1)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(200,45,200,1)",
                            data: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
                         }];

  $scope.stat_distribution_options = { animationEasing: "easeOutElastic",
                                       scaleFontSize: 14 };

  $scope.stat_distribution_data = { labels: $scope.stat_distribution_labels,
                                    datasets: stat_distribution_datasets };

  $scope.stat_distribution_ctx = document.getElementById("statDistributionChart").getContext("2d");
  $scope.stat_distribution_chart = new Chart($scope.stat_distribution_ctx).StackedBar($scope.stat_distribution_data, $scope.stat_distribution_options);

  /*
  $scope.build_data = [
    [0, 10, 0, 30, 40, 50, 0, 70, 80, 90, 100]
  ];*/
});


app.controller('buildStatsCtrl', function($scope, $http, $timeout) {
  function parseStatCollection(stat_data) {
    /*
    datasets[0].data = [];
    datasets[1].data = [];
    datasets[2].data = [];*/

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
      if (!(i % 5)) {
        var label_index = i/5;
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
  }

  GetChampionJson($scope, $http);
  GetItemlistJson($scope, $http);

  // KDA Chart
  $scope.kda_labels = [];
  for (var i=0; i<=kda_timeline_length; i++) {
      $scope.kda_labels.push(i*5+' (0)');
  }

  var kda_datasets =  [{
                          label: "Kills",
                          fillColor: "rgba(70, 200, 70,0.02)",
                          strokeColor: "rgba(70, 200, 70,1)",
                          pointColor: "rgba(70, 200, 70,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(70, 200, 70,0.8)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Deaths",
                          fillColor: "rgba(247,70,74,0.02)",
                          strokeColor: "rgba(247,70,74,1)",
                          pointColor: "rgba(247,70,74,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(200,200,45,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       },
                       {
                          label: "Assists",
                          fillColor: "rgba(151,187,205,0.02)",
                          strokeColor: "rgba(151,187,205,1)",
                          pointColor: "rgba(151,187,205,1)",
                          pointStrokeColor: "#fff",
                          pointHighlightFill: "#fff",
                          pointHighlightStroke: "rgba(45,200,45,1)",
                          data: [ 0,0,0,0,0,0,0,0,0,0,0 ]
                       }];

  $scope.kda_data = { labels: $scope.kda_labels,
                      datasets: kda_datasets };

  $scope.kda_options = {
    scaleOverride: true,
    scaleSteps: 10,
    scaleStepWidth: 1,
    scaleStartValue: 0
  };

  $scope.kda_ctx = document.getElementById("kdaChart").getContext("2d");
  $scope.kda_chart = new Chart($scope.kda_ctx).Line($scope.kda_data, $scope.kda_options);

  $scope.tiers = [ { id: 1, name: 'Bronze' },
                   { id: 2, name: 'Silver' },
                   { id: 3, name: 'Gold' },
                   { id: 4, name: 'Platinum' },
                   { id: 5, name: 'Diamond' },
                   { id: 6, name: 'Master' },
                   { id: 7, name: 'Challenger' } ];

  $scope.patches = [ '5.15',
                     '5.14' ];

  $scope.submit = function() {
  delete $scope.victory_response;
  delete $scope.defeat_response;

  $http.get('/stat_collections?championId='+$scope.search.championId+
            '&tier='+$scope.search.tier+
            '&patch='+$scope.search.patch+
            '&victory=true')
    .then(function(res){
      $scope.victory_response = res.data;
      parseStatCollection( $scope.victory_response );
      $scope.displayed = 'victory';
    }, function(res){
      // 404 / Error Handling
    });
  $http.get('/stat_collections?championId='+$scope.search.championId+
            '&tier='+$scope.search.tier+
            '&patch='+$scope.search.patch+
            '&victory=false')
    .then(function(res){
      $scope.defeat_response = res.data;
    }, function(res){
      // 404 / Error Handling
    });
  };

  $scope.kda_click = function () {
    console.log('wat');
    if ($scope.displayed) {
      if ($scope.displayed == 'victory' && $scope.defeat_response) {
        parseStatCollection( $scope.defeat_response );
        $scope.displayed = 'defeat';
      } else if ($scope.displayed == 'defeat' && $scope.victory_response) {
        parseStatCollection ( $scope.victory_response );
        $scope.displayed = 'victory';
      }
    }
  };
});