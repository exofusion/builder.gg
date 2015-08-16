var app = angular.module('coreApp', ['chart.js']);

function parseStatCollection($scope, stat_data) {
  $scope.data = [ [], [], [] ];

  var killTally = 0;
  var deathTally = 0;
  var assistTally = 0;
  for (var i = 0; i<stat_data.aggregateStats.length; i++) {
    killTally += stat_data.aggregateStats[i].kills;
    deathTally += stat_data.aggregateStats[i].deaths;
    assistTally += stat_data.aggregateStats[i].assists;
    if (!(i % 5) && i <= 50) {
      $scope.labels[i/5] = i+' ('+stat_data.aggregateStats[i].samples+')';
      //data[0].push(tally);
      $scope.data[0].push(killTally/stat_data.aggregateStats[i].samples);
      $scope.data[1].push(deathTally/stat_data.aggregateStats[i].samples);
      $scope.data[2].push(assistTally/stat_data.aggregateStats[i].samples);
      killTally = 0;
      deathTally = 0;
      assistTally = 0;
    }
  }
}

app.controller('mainCtrl', function($scope, $http) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      $scope.champion_array = [];
      $scope.champion_json = res.data.data;
      for (champ in $scope.champion_json) {
        $scope.champion_array.push($scope.champion_json[champ]);
      }

      $scope.search.championId = $scope.champion_json['Katarina'].id;
    });

  // KDA Chart
  $scope.series = [ 'Kills', 'Deaths', 'Assists' ];
  $scope.labels = [];
  for (var i=0; i<=10; i++) {
      $scope.labels.push(i*5+' (0)');
  }

  $scope.kda_colors = [
    { // Kill
        //fillColor: "rgba(247,70,74,0.02)",
        //strokeColor: "rgba(247,70,74,1)",
        fillColor: "rgba(70, 200, 70,0.02)",
        strokeColor: "rgba(70, 200, 70,1)",
        pointColor: "rgba(70, 200, 70,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(70, 200, 70,0.8)"
    },
    { // Death
        //fillColor: "rgba(220,220,220,0.02)",
        //strokeColor: "rgba(220,220,220,1)",
        fillColor: "rgba(247,70,74,0.02)",
        strokeColor: "rgba(247,70,74,1)",
        pointColor: "rgba(247,70,74,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(247,70,74,0.8)"
    },
    { // Assist
        fillColor: "rgba(151,187,205,0.02)",
        strokeColor: "rgba(151,187,205,1)",
        pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(151,187,205,0.8)"
    } ];

  $scope.kda_options = {
    scaleOverride: true,
    scaleSteps: 10,
    scaleStepWidth: 1,
    scaleStartValue: 0
  };

  $scope.tiers = [ { id: 1, name: 'Bronze' },
                   { id: 2, name: 'Silver' },
                   { id: 3, name: 'Gold' },
                   { id: 4, name: 'Platinum' },
                   { id: 5, name: 'Diamond' },
                   { id: 6, name: 'Master' },
                   { id: 7, name: 'Challenger' } ];

  $scope.patches = [ '5.15.0.336',
                     '5.15.0.325',
                     '5.14.0.329',
                     '5.13.0.335' ];
/*
  $scope.labels = ["HP", "Mana", "Armor", "MR", "AD", "AP", "Health Regen", "Mana Regen", "Crit Chance", "AS", "MS"];
  $scope.series = ['Series A'];
  $scope.data = [
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  ];*/

  $scope.submit = function() {
    $http.get('/stat_collections?championId='+$scope.search.championId+
              '&tier='+$scope.search.tier+
              '&patch='+$scope.search.patch+
              '&victory='+$scope.search.victory)
      .then(function(res){
        parseStatCollection( $scope, res.data );
      }, function(res){
        // 404 / Error Handling
      });
  };
/*
  $scope.onClick = function (points, evt) {
    var scopeData = $scope.data;
    for(var i=0; i<scopeData.length; i++) {
      for(var j=0; j<scopeData[i].length; j++) {
        scopeData[i][j] = Math.floor((Math.random() * 100) + 1);
      }
    }
  };
  */
});

// Create the 'chart-stacked-bar' class/attribute directive:
angular.module('coreApp')
  .directive('chartStackedBar', function (ChartJsFactory) { 
    return new ChartJsFactory('StackedBar'); 
  });