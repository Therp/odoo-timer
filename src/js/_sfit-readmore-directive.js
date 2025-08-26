/*
    Copyright 2016 - 2022 Therp (http://sunflowerweb.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

sfitTimerApp.directive('hmRead', function () {
    return {
        restrict:'AE',
        scope:{
            hmtext : '@',
            hmlimit : '@',
            hmrecord : '@',
            hmsource: '@',
            hmhost : '@',
            hmfulltext:'@',
            hmMoreText:'@',
            hmLessText:'@',
            hmMoreClass:'@',
            hmLessClass:'@',
        },
        templateUrl: '/js/readmore-template.html',
        controller : function ($scope) {
            $scope.toggleValue=function () {

                if ($scope.hmfulltext == true) {
                    $scope.hmfulltext=false;
                } else if ($scope.hmfulltext == false) {
                    $scope.hmfulltext=true;
                } else {
                    $scope.hmfulltext=true;
                }
            };
        },
    };
});

