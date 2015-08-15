var app = angular.module('coreApp', ['chart.js']);

app.controller('mainCtrl', function($scope, $http) {
  $http.get('/static-json/champion.json')
    .then(function(res){
      $scope.championJson = res.data;
      $scope.search.championId = $scope.championJson.data['Katarina'].id;
    });

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

  $scope.labels = ["HP", "Mana", "Armor", "MR", "AD", "AP", "Health Regen", "Mana Regen", "Crit Chance", "AS", "MS"];
  $scope.series = ['Series A', 'Series B'];
  $scope.data = [
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  ];

  $scope.submit = function() {
    $http.get('/stat_collections?championId='+$scope.search.championId+
              '&tier='+$scope.search.tier+
              '&patch='+$scope.search.patch+
              '&victory='+$scope.search.victory)
      .then(function(res){
        $scope.stat_collection = res.data;
      }, function(res){
        $scope.stat_collection = { error: true,
                                   status: res.status,
                                   data: res.data };
      });
  };

  $scope.onClick = function (points, evt) {
    var scopeData = $scope.data;
    for(var i=0; i<scopeData.length; i++) {
      for(var j=0; j<scopeData[i].length; j++) {
        scopeData[i][j] = Math.floor((Math.random() * 100) + 1);
      }
    }
  };
});

// Create the 'chart-stacked-bar' class/attribute directive:
angular.module('coreApp')
  .directive('chartStackedBar', function (ChartJsFactory) { 
    return new ChartJsFactory('StackedBar'); 
  });