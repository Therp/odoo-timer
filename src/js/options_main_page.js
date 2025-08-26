/*
    Copyright 2016 - 2022 Therp (http://therp.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

var sfitTimerAppOptions = angular.module(
    'sfitTimerAppOptions',
    [
        'odoo',
        'ngCookies',
        'ngSanitize',
    ]
);

sfitTimerAppOptions.directive('hmRead', function () {
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

sfitTimerAppOptions.controller('mainController', [
    '$scope', '$cookies', '$http', '$window', '$timeout', '$rootScope', '$location', 'jsonRpc',
    function ($scope, $cookies, $http, $window, $timeout, $rootScope, $location, jsonRpc, data) {
    $scope.options = {};
    $scope.options.active_page = 'options';

    $scope.goToPage = function (page) {
        $scope.options.active_page = page;
        $scope.getRemoteList();
    }

    // Get list of stored remotes
    $scope.getRemoteList = function () {
        storage.getItem('remote_host_info', function(remotes) {
            if (remotes && remotes.length) {
                var remote_lst = [];
                for (let remote of remotes) {
                    remote_lst.push(JSON.parse(remote));
                }
                $scope.$apply(function() {
                    $scope.remote_hosts = remote_lst;
                });
            }
        });
    }

    // Remove a remote
    $scope.remove_remote = function (host) {
        alert.show("Are you sure you want to remove remote ['" +
            host +  "'] </br><span style='font-size:20px;'>&#128533;</span>" +
            " ?", ['Yes','No']).then(function(res) {
                if (res === 'Yes') {
                    if (host) {
                        $scope.getRemoteList();
                        for (let remote of $scope.remote_hosts) {
                            if (remote.url === host) {
                                jsonRpc.getSessionInfo().then(async function (result) {
                                    if (result.session_id) {
                                        var url = result['web.base.url'] || 'https://sunflower.1systeem.nl';
                                        if (host === url) {
                                            var cookies = await browser.cookies.getAll(
                                                {'name': 'session_id', 'url': url});
                                            cookies.forEach(async (cookie)=>{
                                                var res = await browser.cookies.remove({
                                                    'name': cookie.name,
                                                    'storeId': cookie.storeId,
                                                    'url': url || 'https://' + cookie.domain
                                                });
                                                console.log(res);
                                            });
                                        }
                                        $scope.getRemoteList();
                                    }
                                }).catch(async function(error){
                                    // https://stackoverflow.com/questions/50771902/chrome-cookies-getall-returns-an-empty-array
                                    // E.g to test this use localhost instance
                                    // see img sample-33.png for more
                                    console.log("ERROR: " + JSON.stringify(
                                        error)); // Possible error Http Error
                                    var cookies = await browser.cookies.getAll(
                                        {'name': 'session_id', 'url': host});
                                    cookies.forEach(async (cookie)=>{
                                        var res = await browser.cookies.remove({
                                            'name': cookie.name,
                                            'storeId': cookie.storeId,
                                            'url': host || 'https://' + cookie.domain
                                        });
                                        console.log(res);
                                        $scope.getRemoteList();
                                    });
                                });
                                $scope.remote_hosts = $scope.remote_hosts
                                    .filter((x)=> x.url !== host)
                                    .map((x)=> JSON.stringify(x));
                                storage.removeItem('remote_host_info');
                                storage.setItem('remote_host_info',
                                    $scope.remote_hosts);
                                alert.show("[" + host + "] removed" +
                                    " successfully!");
                                $scope.getRemoteList();
                            }
                        }
                    }
                }
        })
    }

    // Add remote
    $scope.add_remote_host = function () {
        $scope.remote_error = "";
        if ($scope.data) {
            if (('remote_host' in $scope.data && $scope.data.remote_host !== '') &&
                ('remote_name' in $scope.data && $scope.data.remote_name !== '') &&
                ('remote_database' in $scope.data && $scope.data.remote_database !== '')) {
                var remote_host = {
                    'url': $scope.data.remote_host,
                    'name': $scope.data.remote_name || $scope.data.remote_host,
                    'database': $scope.data.remote_database,
                    'datasrc': $scope.data.remote_datasrc,
                    'state': 'Inactive'
                }
                // Check if url is valid for storage.
                if (validURL($scope.data.remote_host)) {
                    // Check existing remotes
                    storage.getItem("remote_host_info", function (remotes) {
                        if (remotes && remotes.length) {
                            // Check if a duplicate remote already exists
                            if (checkDupRemotes(remote_host, remotes))
                                return alert.show(remote_host.url + " and "
                                    + remote_host.database +
                                    " already exist no duplicates allowed");
                            else {
                                // Add new remote
                                remotes.push(JSON.stringify(
                                    remote_host));
                                // store new updated list of remotes
                                storage.setItem('remote_host_info', remotes);
                                alert.show("Host [" + remote_host.url +"] " +
                                    "added to the list Successfully. Logout to" +
                                    " check");
                            }

                        } else {
                            // Create a new Remote if cache/storage cleared.
                            var remotes_lst = [JSON.stringify(
                                remote_host)];
                            storage.setItem('remote_host_info', remotes_lst);
                            alert.show("Host [" + remote_host.url +"] " +
                                "created successfully. Logout to check");
                        }
                        // update list
                        $scope.getRemoteList();

                        // clear fields
                        $scope.data.remote_host = '';
                        $scope.data.remote_database = '';
                        $scope.data.remote_name = '';
                    });
                } else {
                    alert.show("ERROR: Invalid URL syntax")
                }
            } else {
                alert.show("ERROR: Fields cannot be empty");
            }
        } else {
            alert.show("ERROR: Fields cannot be empty");
        }
    }

    function checkDupRemotes(new_remote, remotes) {
        for (let remote of remotes) {
            let rem = JSON.parse(remote);
            if (rem.url === new_remote.url &&
                rem.database === new_remote.database)
                return true;
        }
        return false;
    }

    // Remove all hosts and any sessions stored
    $scope.remove_all_remotes_hosts = function () {
        alert.show("Are you sure you want to remove all the remotes<br/>" +
            "<span style='font-size:20px;'>&#128534;</span>?",
            ['Yes', 'No']).then(function(res) {
            if (res === 'Yes') {
                storage.getItem('current_host', function (host) {
                    jsonRpc.odoo_server = host || 'https://sunflower.1systeem.nl';
                    // Clear the default odoo sessions store in browser
                    // NB: Odoo v8 doesn't give the url
                    jsonRpc.getSessionInfo().then(async function (result) {
                        if (result.session_id) {
                            var url = result['web.base.url'] || 'https://sunflower.1systeem.nl'
                            var cookies = await browser.cookies.getAll(
                                {'name': 'session_id', 'url': url});
                            cookies.forEach(async (cookie)=>{
                                var res = await browser.cookies.remove({
                                    'name': cookie.name,
                                    'storeId': cookie.storeId,
                                    'url': url || 'https://' + cookie.domain
                                });
                                console.log(res);
                            });
                        }
                    });
                });
                storage.getItem("remote_host_info", function (remotes) {
                    if (remotes) {
                        for (let remote of remotes) {
                            remote = JSON.parse(remote);
                            storage.removeItem(remote['database']);
                        }
                    }
                });
                storage.removeItem('remote_host_info');
                document.cookie  = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                alert.show("Host list removed successfully!");
                $scope.getRemoteList();
            }
        });
    }
}]);