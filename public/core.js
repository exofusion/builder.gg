var app = angular.module('coreApp', ['chart.js']);

app.controller('mainCtrl', function($scope) {
  $scope.labels = ["HP", "Mana", "Armor", "MR", "AD", "AP", "Health Regen", "Mana Regen", "Crit Chance", "AS", "MS"];
  $scope.series = ['Series A', 'Series B'];
  $scope.data = [
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  ];

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