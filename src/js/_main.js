/*
    Copyright 2016 - 2022 Therp (http://therp.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

var sfitTimerApp = angular.module(
    'sfitTimerApp',
    [
        'odoo',
        'ngCookies',
        'timer',
        'ui.bootstrap',
        'ngSanitize',
    ]
);

sfitTimerApp.controller('mainController', [
    '$scope', '$cookies', '$http', '$window', '$timeout', '$rootScope', '$location', 'jsonRpc',
    function ($scope, $cookies, $http, $window, $timeout, $rootScope, $location, jsonRpc, data) {
        $scope.remote_info = '';
        $scope.limitRange = [
            {val:'5', opt: '5'},
            {val:'10', opt: '10'},
            {val:'15', opt: '15'},
            {val:'', opt: 'All'},
        ];
        $scope.remotes = [];
        $scope.allIssues = false;
        $scope.issue_desc = '';

        // Existing session checker
        $scope.$watch('data.useExistingSession', function() {
            storage.removeItem('useExistingSession');
            storage.setItem('useExistingSession', 
            $scope.data.useExistingSession);

        });

        // Assign all issues
        $scope.$watch('allIssues', function () {
            if (!$scope.allIssues && $scope.data.user) {
                $scope.data.user_id = $scope.data.user.id;
            } else {
                $scope.data.user_id = '';
            }
        });

        // Attach fixed header background and remove when back
        $('#table-task-issues').scroll(function() {
           $('#table-task-issues thead').css({'background': '#fff'});
           if ($(this).scrollTop() === 0)
               $('#table-task-issues thead').css({'background': ''});
        });


        // Toggle password view
        $scope.displayPass = function () {
            var uniq_pass = document.getElementById('unique-password');
            uniq_pass && uniq_pass.type === 'text' ?
                uniq_pass.type = 'password' : uniq_pass.type = 'text';
        }

        // Times Start/Stop callbacks
        //---------------------------------------------------------
        $scope.timerRunning = true;
        $scope.startTimer = function () {
            $scope.$broadcast('timer-resume');
            $scope.timerRunning = true;
            // Change icon to start
            browser.runtime.sendMessage({TimerActive: true});
            console.log("Start Time: " + $scope.startTimeCount._d);
        };
        $scope.stopTimer = function () {
            $scope.$broadcast('timer-stop');
            $scope.$broadcast('timer-reset');
            $scope.$broadcast('timer-clear');
            $scope.timerRunning = false;
        };
        $scope.$on('timer-tick', function (event, data) {
            $scope.currentValue = data.millis;
        });

        //---------------------------------------------------------

        //-----------------------------------
        /* MAIN CODE */
        storage.getItem("start_date_time", function (start_date_time) {
            if (start_date_time) {
                $scope.current_date = JSON.parse(start_date_time);
                $scope.startTimeCount = $scope.current_date.start_time;
            } else {
                console.log('no active timer found');
            }
        });

        $scope.data = {};
        $scope.data.today = new Date();

        // Assign an active timer
        storage.getItem("active_timer_id", function (active_timer_id) {
            if (active_timer_id) {
                $scope.data.active_timer_id = active_timer_id;
            } else {
                console.log('no active issue found');
            }
        });

        // default data source
        $scope.data.dataSource = 'project.issue';

        // Set current data src already configured
        storage.getItem('current_host_datasrc', function(src) {
            if (src && src.length) {
                $scope.data.dataSource = src;
            }
        });

        // Try login with current user session
        storage.getItem('current_host', function(host) {
            if (host && host.length) {
                jsonRpc.odoo_server = host;
            }
            $scope.trySession();
        });

        // Assign remotes already configured
        storage.getItem('remote_host_info', function(remotes) {
            if (remotes && remotes.length) {
                $scope.remotes_info = remotes;
                var count = 0;
                remotes.forEach(remote => {
                remote = JSON.parse(remote);
                    $scope.remotes.push({'id': count, 'label': remote.name});
                    count++;
                });
            }
        });

        //Odoo version info
        $scope.remote_version = function () {
            jsonRpc.getServerInfo().then(function(result){
                storage.setItem('server_version_info', JSON.stringify(result));
                $scope.server_version = result['server_version'];
            }).catch((error)=>{console.log(error)});
        }

        // Get session based on configured remotes and login using it
        $scope.trySession = function() {
            // Check if user is logged in and set user:
            jsonRpc.getSessionInfo().then(function (result) {
                $scope.remote_version();
                if ($scope.remotes.length && $scope.data.useExistingSession) {
                    var remote_host = $("#remote-selection option:selected");
                    var selected_host = {};
                    // If remotes exists and has been selected use its value
                    if (remote_host.length && remote_host.val()) {
                        selected_host = JSON.parse(
                            $scope.remotes_info[remote_host.val()]);
                        storage.getItem(selected_host['database'], function (res) {
                            if (res) {
                                var info = JSON.parse(res);
                                $scope.set_current_user(info);
                                $scope.current_active_session = info.session_id;
                                $scope.database = info.db;
                                $scope.data.dataSource = selected_host['datasrc'];
                                storage.setItem(
                                    'current_host', selected_host['url']);
                                storage.setItem(
                                    'current_host_db', selected_host['database']);
                                storage.setItem(
                                    'current_host_datasrc', selected_host['datasrc']);
                                storage.setItem(
                                    'current_host_state', 'Active');
                                jsonRpc.odoo_server = selected_host['url'];
                                $scope.loginLoading = false;
                                var remotes = $scope.remotes_info.map(
                                    (x)=> JSON.parse(x));
                                var host = remotes.find(
                                    (x) => x.database === result.db);
                                $scope.database = result.db;
                                $scope.current_host = host.url || result['web.base.url'];
                                $scope.current_database = host.database || result.db;
                                $scope.data.dataSource = host.datasrc;
                            }

                        });
                    }
                    else {
                        alert.show("Select a remote and try to login");
                    }
                }
                else if (result.uid) {
                    $scope.set_current_user(result);
                    $scope.current_active_session = result.session_id;
                    var remotes = $scope.remotes_info.map((x)=> JSON.parse(x));
                    var host = remotes.find((x) => x.database === result.db);
                    $scope.database = result.db;
                    $scope.current_host = host.url || result['web.base.url'];
                    $scope.current_database = host.database || result.db;
                    $scope.data.dataSource = host.datasrc;
                    $scope.loginLoading = false;
                }
                else if ($scope.remotes.length && !$scope.data.useExistingSession) {
                    let lst = '';
                    for (let remote of $scope.remotes) {
                        lst += '<li>'+ remote.label + '</li>';
                    }
                    alert.show("The following remotes exist, but have no" +
                        " session:"+ lst +"Use them to login");
                    $scope.to_login();
                }
                else {
                    alert.show('Automatic login failed, no active' +
                        ' session found and no remote configured. Go to' +
                        ' "Options" below and configure a remote to login', ['OK'])
                        .then(function(res) {
                            if (res === 'OK')
                                $scope.to_login();
                        });
                }
            }).catch(function(error) {
                console.log("ERROR: " + JSON.stringify(error));
                alert.show('Automatic login failed, no active' +
                    ' session found\n\n', ['OK']).then(function(res) {
                        if (res === 'OK')
                            $scope.to_login();
                    });
            });
        };
        //-----------------------------------

        // Start timer
        $scope.startTimer1 = function (issue) {
            $scope.odoo_error = '';
            var now = moment();
            issue.currentRunning = 1;
            // Change icon to active
            browser.runtime.sendMessage({TimerActive: true});

            // Start timer
            $scope.startTimeCount = now;
            $scope.active_timer = now;
            $scope.startTimer();

            // Show start/stop buttons on other issues
            var timer_info = {
                'start_time': now,
                'issue_id': issue.id,
            };
            $scope.current_date = timer_info;
            storage.setItem('start_date_time', JSON.stringify(timer_info));
            storage.setItem("active_timer_id", issue.id);
            storage.getItem("active_timer_id", function (active_timer_id) {
            if (active_timer_id) {
                console.log("ACTIVE TIMER FOUND: "+ active_timer_id);
                $scope.data.active_timer_id = active_timer_id;
            } else {
                console.log('NO ACTIVE TIMER');
            }
        });
        };

        $scope.stopActiveTimer1 = function () {
            storage.getItem("start_date_time", function (time) {
                var startTimeInfo = JSON.parse(time);
                $scope.stopTimer1(startTimeInfo.issue_id);
            });
        };

        const objectToCSV = function (data) {
            const csvRows = [];
            const headers = Object.keys(data[0]);
            csvRows.push(headers.join(','));
            for (const row of data) {
                const values = headers.map(header => {
                    const val = row[header]
                    return `"${val}"`;
                });
                csvRows.push(values.join(','));
            }
            return csvRows.join('\n');
        };

        // Download locally only specific issue timesheet for current month
        function auto_download_current_issue (issue) {
            var model = $scope.data.dataSource == 'project.task'? 
            'account.analytic.line' :'hr.analytic.timesheet';
            var task_domain = $scope.data.dataSource == 'project.task' ? 
            ['task_id', '=', issue.id] : ['issue_id', '=', issue.id];
            if ($scope.data.dataSource == 'project.task')
                model = 'account.analytic.line';
            var today = new Date();
            var first_day = new Date(today.getFullYear(), today.getMonth(), 1);
            var first_date = first_day.toJSON().slice(0,10);
            var current_date = new Date().toJSON().slice(0,10);
            var domain = [
                ['user_id', '=', $scope.data.user.id],
                ['create_date', '>=', first_date],
                ['create_date', '<=', current_date]
            ];
            domain.push(task_domain);
            var fields = [];
            var link = document.createElement("a");
            var $download_icon = $(`<i class="fa fa-download fa-2x" 
            data-toggle="tooltip" data-placement="top" 
            title="Download Timesheet"></i>`);
            var csv_data = '';
            var now = new Date().toGMTString();
            var filename = `Timesheet-#${issue.id}-[${now}].csv`;
            link.download = filename;
            link.appendChild($download_icon[0]);

            jsonRpc.searchRead(model, domain, fields).then(function (response) {
                if ('records' in response && response.records.length) {
                    csv_data = objectToCSV(response.records);
                    $scope.data.timesheet_csv = csv_data;
                    csvData = new Blob(
                        [csv_data], 
                        {
                            type: 'application/csv;charset=utf-8;'
                        }
                    ); 
                    link.href = URL.createObjectURL(csvData);
                    link.click();
                    alert.show(`Timesheet for issue <b>#${issue.id}</b></br>
                    has been saved locally as<br/> <b>${filename}</b></br> 
                    in Downloads.<br/>
                    <span style='font-size: 30px; color; #ffbf00;'>&#128077;
                    </span>
                    `);
                } 
            });

        }

        // Allows you download to a copy of timesheet on local based on 
        // current month
        $scope.getTimesheets = function () {
            var model = $scope.data.dataSource == 'project.task'? 
            'account.analytic.line' :'hr.analytic.timesheet';
            var today = new Date();
            var first_day = new Date(today.getFullYear(), today.getMonth(), 1);
            var first_date = first_day.toJSON().slice(0,10);
            var current_date = new Date().toJSON().slice(0,10);
            var domain = [
                ['user_id', '=', $scope.data.user.id],
                ['create_date', '>=', first_date],
                ['create_date', '<=', current_date]
            ];
            var fields = [];
            if (!$('.month_timesheet_download').length) {
                var link = document.createElement("a");
                var $download_icon = $(`<i class="fa fa-download fa-2x" 
                data-toggle="tooltip" data-placement="top" 
                title="Download current month timesheet"></i>`);
                var csv_data = '';
                var now = new Date().toGMTString();
                link.download = `Timesheet [${now}].csv`;
                link.classList.add('month_timesheet_download');
                link.appendChild($download_icon[0]);
                jsonRpc.searchRead(model, domain, fields).then(function (response) {
                    if ('records' in response && response.records.length) {
                        csv_data = objectToCSV(response.records);
                        $scope.data.timesheet_csv = csv_data;
                        csvData = new Blob(
                            [csv_data], 
                            {
                                type: 'application/csv;charset=utf-8;'
                            }
                        ); 
                        link.href = URL.createObjectURL(csvData);
                        $(link).insertBefore($('.options-btn'));
                    }
                });
            }
        }
        
        $(document).on("click", "a.month_timesheet_download", function(){
            var today = new Date();
            var first_day = new Date(today.getFullYear(), today.getMonth(), 1);
            var first_date = first_day.toJSON().slice(0,10);
            var current_date = new Date().toJSON().slice(0,10);
            var username = $scope.data.user.display_name;
            var now = new Date().toGMTString();
            var filename = `Timesheet [${now}].csv`;
            alert.show(`Timesheet for <b>${username}</b>:</br> 
            Dated <b>${first_date}</b> to <b>${current_date}</b></br> 
            has been saved locally as<br/><b>${filename}</b></br> 
            in Downloads.<br/>
            <span style='font-size: 30px; color; #ffbf00;'>&#128077;</span>`);
            
        });
        // Stop timer
        $scope.stopTimer1 = function (id) {
            var edit_issue_desc = $('tr#' + id).find('#edit_issue_desc_opt')
            .prop('checked');
            if (edit_issue_desc)
             {
                alert.show(`
                <label for='new_issue_desc'>#${id} Description</label>
                <textarea class='form-control' id='new_issue_desc' rows='7'/>`, 
                ['Save', 'close']).then(function(res) {
                    if (res === 'Save') {
                        var desc = $('#new_issue_desc').val();
                        if (desc != '') {
                            $scope.issue_desc = desc;
                            _SubmitIssueTime(id);
                        }
                        else {
                            alert.show(`You cannot have <b>Edit Issue Desc</b> 
                            on and submit an <b>empty value</b> <span 
                            style="font-size: 20px;">&#128580;</span>. Either 
                            remove checker or <b>add a description
                            </b> for the current issue then submit`);
                        }
                    }
                });
            }
            
            else {
                _SubmitIssueTime(id);
            }
            // When 'enter' key is pressed we submit the issue time
            document.addEventListener('keydown', function(event) {
                if($('#new_issue_desc').is(':visible')) {
                    var desc = $('#new_issue_desc').val();
                    if (event.key === 'Enter') {
                        if (desc !== '') {
                                $scope.issue_desc = desc;
                                _SubmitIssueTime(id);
                            }
                        else {
                            alert.show(`You cannot have <b>Edit Issue Desc</b> 
                            on and submit an <b>empty value</b> <span 
                            style="font-size: 20px;">&#128580;</span>. Either 
                            remove checker or <b>add a description
                            </b> for the current issue then submit`);
                        }
                        }
                    }
                });

            
            function _SubmitIssueTime(issue) {
                var id = issue;
                // Change icon to inactive
                browser.runtime.sendMessage({TimerActive: false});

                // Stop timer
                $scope.stopTimer();

                // Show start/stop buttons on other issues
                $scope.current_date = false;

                var now = moment();
                var timer_info = {
                    'stop_time': now,
                    'issue_id': id,
                };
                storage.setItem('stop_date_time', JSON.stringify(timer_info));
                storage.getItem("start_date_time", function (time) {
                    var startTimeInfo = JSON.parse(time);
                    if (startTimeInfo) {
                        // Get time difference in minutes
                        var durationMins = moment.duration(
                            now.diff(startTimeInfo.start_time)).asMinutes();
                        var mins = Math.round(durationMins % 60/15) * 15;
                        var durationInHours = Math.floor(durationMins/60) + mins/60;
                        var issue = $scope.data.employee_issues.find(
                            function(o) {return o.id === id});
                        if (!issue) {
                            $scope.odoo_error = "Issue " + id + " not found";
                            return;
                        }

                        var analytic_account_id = issue.analytic_account_id;
                        if (!analytic_account_id) {
                            var project = $scope.data.projects.find(
                                function (o) {return o.id === issue.project_id[0];}
                            );
                            if (!project) {
                                $scope.odoo_error = "Project not found.";
                                return;
                            }
                            analytic_account_id = project.analytic_account_id;
                        }
                        if (!analytic_account_id) {
                            $scope.odoo_error = "No Analytic Account is defined on the project.";
                            return;
                        }

                        $scope.analytic_journal = null
                        createTimesheet();

                        // Post to odoo hr.analytic.timesheet, create new time sheet
                        function createTimesheet () {
                            var issue_name = issue.name+' (#'+issue.id+')';
                            if ($scope.issue_desc != '')
                                    issue_name = $scope.issue_desc;
                            if ($scope.data.dataSource === 'project.issue') {
                                // Search analytic journal for timesheet
                                $scope.model = 'account.analytic.journal';
                                $scope.domain = [['name', 'ilike', 'Timesheet']];
                                $scope.fields = ['name'];

                                jsonRpc.searchRead($scope.model, $scope.domain, $scope.fields)
                                    .then(function (response) {
                                        $scope.analytic_journal = response.records[0];
                                        var args = [{
                                            'date': now.format('YYYY-MM-D'),
                                            'user_id': $scope.data.user.id,
                                            'name': issue_name,
                                            'journal_id': $scope.analytic_journal.id,
                                            "account_id": analytic_account_id[0],
                                            "unit_amount": durationInHours,
                                            "to_invoice": 1,
                                            "issue_id": issue.id,
                                        }];
                                        var kwargs = {};
                                        jsonRpc.call(
                                            'hr.analytic.timesheet',
                                            'create',
                                            args,
                                            kwargs
                                        ).then(function (response) {

                                            alert.show("Time for issue #" +
                                                issue.id + " recorded successfully!"
                                            );
                                            if ($scope.auto_download_issue_timesheet && issue)
                                                auto_download_current_issue(issue);
                                                
                                        }).catch(function(error) {
                                            alert.show("<b>Error Occurred</b>" +
                                                "<br/><p>" + JSON.stringify(error) +
                                                "</p>");
                                        });

                                    }, odoo_failure_function);
                            }
                            else {
                                // project.tasks e.g Therp system
                                var args = [{
                                    'date': now.format('YYYY-MM-D'),
                                    'user_id': $scope.data.user.id,
                                    'name': issue_name,
                                    "account_id": analytic_account_id[0],
                                    "unit_amount": durationInHours,
                                    "project_id": issue.project_id[0],
                                    "task_id": issue.id,
                                }];
                                var kwargs = {};
                                jsonRpc.call(
                                    'account.analytic.line',
                                    'create',
                                    args,
                                    kwargs
                                ).then(function (response) {
                                    
                                    alert.show("Time for Task #" +
                                        issue.id + " recorded successfully!"
                                    );
                                    if ($scope.auto_download_issue_timesheet && issue)
                                        auto_download_current_issue(issue);
                                }).catch(function(error) {
                                    alert.show("<b>Error Occurred</b><br/><p>" +
                                        JSON.stringify(error) +"</p>");
                                });

                            }
                        }

                    } else {
                        console.log('No time info');
                    }
                });

                // Removes the highlighted active timer.
                $scope.data.active_timer_id = false;

                // Clear storage
                storage.removeItem("active_timer_id");
                storage.removeItem("start_date_time");
            }
        };

        // LOGIN process
        $scope.login = function () {
            $('.remote-info').removeClass('alert alert-info');
            var remote_host = $("#remote-selection option:selected");
            var selected_host = {};
            // If remotes exists use its values
            if (remote_host.length && remote_host.val()) {
                selected_host = JSON.parse(
                    $scope.remotes_info[remote_host.val()]);
            }
            // else add or create remote host to storage via Options link
            else {
                alert.show("There is no remote configured, please Click" +
                    " 'options' below the form and add a remote.");
            }
            jsonRpc.odoo_server = selected_host.url;
            storage.setItem(
                'current_host', selected_host['url']);
            storage.setItem(
                'current_host_db', selected_host['database']);
            $scope.database = selected_host.database;
            $scope.current_host = selected_host['url'];
            $scope.current_database = selected_host.database;
            $scope.data.dataSource = selected_host['datasrc'];
            $scope.loginLoading = true;
            if ($scope.data.useExistingSession) {
                $scope.trySession();
            }
            else if (!$scope.data.username || !$scope.data.password) {
                $scope.loginLoading = false; 
                $scope.loginError = 'Username or Password is missing';
                alert.show("Username or Password is missing");
            }
            else {
                jsonRpc
                    .login($scope.database, $scope.data.username, $scope.data.password)
                    .then(function (response) {
                        var host_info = {
                            'host': $scope.data.host,
                            'database': $scope.database,
                        };
                        storage.setItem('host_info', JSON.stringify(host_info));
                        $scope.set_current_user(response);
                        $scope.current_active_session = response.session_id;
                        storage.setItem(
                            'current_host_state', 'Active');
                        $scope.loginLoading = false;
                    }, function (response) {
                        $scope.loginLoading = false;
                        $scope.loginError = response.message;
                    });
            }
        };

        // Footer info about the current remote
        $scope.getRemoteInfo = function () {
            $scope.$apply(function(){
                $scope.remote_instance_info = [{
                    'current_user': $scope.data.user.display_name,
                    'odoo_version': $scope.server_version,
                    'host': $scope.current_host,
                    'db': $scope.current_database,
                    'datasrc': $scope.data.dataSource
                }];
            })

        }

        // Issue/task list view
        $scope.to_main = function () {
            $scope.allIssues = false;
            $("#wrapper").removeClass("hide");
            $("#loader-container").addClass("hide");
            $("#login").addClass("hide");
            let current_issue = $scope.data.employee_issues.find(
                (x)=> x.id === $scope.data.active_timer_id);
            let current_user = $scope.data.user_id;
            let is_user_issue = true;
            if (current_issue && current_user) {
                is_user_issue = current_issue['user_id'][0] === current_user;
            }
            if ($scope.timerRunning && !$scope.allIssues && !is_user_issue) {
                $scope.allIssues = true;
            }
        };

        // Login Form
        $scope.to_login = function () {
            $("#login").removeClass("hide ng-hide");
            $("#loader-container").addClass("hide");
            $("#wrapper").addClass("hide");

            // default true for checkbox once login is visible.
            $scope.data.useExistingSession = true;
        };

        // Logout of Timer App
        $scope.logout = function () {
            alert.show("<b>Are you sure you want to logout?<b> " +
                "Session will be removed and a re-login will be required. " +
                "Instead you can switch between remotes via " +
                "<span style='font-size: 30px; color:" +
                " #ffbf00;'>&#128072;</span>",
                ['logout', 'cancel'])
                .then(function(response) {
                    if (response == 'logout') {
                        var current_issue = $scope.data.active_timer_id;
                        if (current_issue) {
                            alert.show("Please stop timer for issue #" + current_issue
                                + " before login out of current session");
                            return false;
                        }
                        else {
                            jsonRpc.logout();
                            // Delete odoo cookie.
                            $cookies.remove('session_id');
                            $scope.data.user = null;
                            storage.removeItem($scope.current_database);
                            $scope.clearActiveSession();
                            storage.setItem(
                                'current_host_state', 'Inactive');
                            $scope.to_login();
                        }
                    }
                    else {
                        return false;
                    }
            });
        };

        // Set current user
        $scope.set_current_user = function (res) {
            var id = res.uid;
            $scope.data.user = false;
            $scope.model = 'res.users';
            $scope.domain = [['id', '=', id]];
            $scope.fields = ['display_name'];
            jsonRpc.searchRead(
                $scope.model, $scope.domain, $scope.fields
            ).then(function (response) {
                $scope.data.user = response.records[0];
                $scope.data.user_id = $scope.data.user.id;
                storage.getItem("users_issues", function (issues) {
                    if (issues) {
                        $scope.data.employee_issues = JSON.parse(issues);
                        storage.setItem(res.session_id,
                            $scope.data.employee_issues)
                        $scope.to_main();
                        console.log('loaded existing issues');
                    }
                    $scope.load_projects().then(function() {
                        console.log('loaded projects');
                    });

                    $scope.load_employee_issues().then(function() {
                        var users_issues = $scope.data.employee_issues;
                        storage.setItem('users_issues', JSON.stringify(users_issues));
                        $scope.to_main();
                        console.log('loaded new issues');
                    }, function() {
                        $scope.to_main();
                        console.log('no issues found');
                    });
                    $scope.getRemoteInfo();
                });
                $scope.getCurrentIssueList();
                $scope.getTimesheets();
            }).catch(function(error){
                odoo_failure_function(error);
            });
        };

        // Get/Refresh of current issue list
        $scope.getCurrentIssueList = function () {
            storage.getItem($scope.current_active_session, function(issues){
                $scope.data.employee_issues = issues;
            });
        }

        // Switch Between remotes
        $scope.switch_btwn_remotes = function () {
            var current_issue = $scope.data.active_timer_id;
            if (current_issue) {
                alert.show("Please stop timer for issue #" + current_issue
                    + " before switching out of current session");
                return false;
            }

            else {
                $scope.to_login();
            }

        }

        // Clear Active session
        $scope.clearActiveSession = function () {
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
                    });
                }
            }).then(function(){
                alert.show("Session cleared successfully, " +
                    "login again by turning session checkbox off");
                $scope.to_login();
            });
        }

        // Load employee issues
        $scope.load_employee_issues = function () {
            var deferred = new $.Deferred();
            search_employee_issues().then(function (response) {
                process_employee_issues(response);
                deferred.resolve();
            }, function(response) {
                deferred.reject();
            });
            return deferred;
        };

        // Active issue always selected.
        $scope.dynamicIssueList = function(issue) {
            if ('active_timer_id' in $scope.data &&
                issue.id === $scope.data.active_timer_id)
                return issue.id;
            return 'id';
        }

        // Load project list
        $scope.load_projects = function () {
            var deferred = new $.Deferred();
            search_projects().then(function (response) {
                process_projects(response);
                deferred.resolve();
            }, function() {
                deferred.reject();
            });
            return deferred;
        };

        function search_employee_issues () {
            var model = $scope.data.dataSource;
            var domain = [
                '|',
                ['id', '=', $scope.data.active_timer_id],
                '&',
                ['stage_id.name', 'not ilike', '%Done%'],
                '&',
                ['stage_id.name', 'not ilike', '%Cancel%'],
                ['stage_id.name', 'not ilike', '%Hold%'],
            ];
            var fields = [
                'name',
                'user_id',
                'project_id',
                'stage_id',
                'priority',
                'create_date',
                'analytic_account_id',
            ];
            if (model === 'project.issue') {
                fields.push('working_hours_open',
                    'message_summary', 'message_unread');
            }
            if (model === 'project.task') {
                fields.push('effective_hours', 'remaining_hours', 'code');
            }
            return jsonRpc.searchRead(
                model,
                domain,
                fields
            );
        }

        function search_projects() {
            var model = 'project.project';
            var domain = [];
            var fields = [
                'analytic_account_id',
            ];
            return jsonRpc.searchRead(
                model,
                domain,
                fields
            );
        }

        function process_employee_issues (response) {
            $scope.data.employee_issues = [];
            angular.forEach(response.records, function (issue) {
                if (issue['message_unread'] && issue['message_summary']) {
                    issue['message_summary'] = issue['message_summary'].match(
                        /(?=You have)(.*)(?='><)/g)[0];
                }
                issue['priority_level'] = Array(parseInt(issue.priority)).fill(
                    null).map((_, i) => i);
                issue['priority_state'] = get_priority_state(issue.priority);
                $scope.data.employee_issues.push(issue);
            });
            var users_issues = $scope.data.employee_issues;
            storage.setItem('users_issues', JSON.stringify(users_issues));
        }

        function get_priority_state(priority) {
            let state = '';
            switch (priority)
            {
                case '3':
                    state = 'high-priority';
                    break;
                case '2':
                    state = 'medium-priority';
                    break;
                case '1':
                    state = 'low-priority';
                    break;
                case '0':
                    state = 'zero-priority';
                    break;
                default:
                    state = 'none';
                    break;
            }
            return state;
        }

        function process_projects (response) {
            $scope.data.projects = [];
            angular.forEach(response.records, function (project) {
                $scope.data.projects.push(project);
            });
        }

        // Time conversion hrs & mins
        $scope.getTimeInHrsMins = function(time_float) {
            // Check sign of given number
            var sign = (time_float >= 0) ? 1 : -1;

            // Set positive value of number of sign negative
            var number = time_float * sign;

            // Separate the int from the decimal part
            var hour = Math.floor(number);
            var decpart = number - hour;

            var min = 1 / 60;
            // Round to nearest minute
            decpart = min * Math.round(decpart / min);

            var minute = Math.floor(decpart * 60) + '';
            // Add padding if need
            if (minute.length < 2) {
                minute = '0' + minute;
            }
            // Add Sign in final result
            sign = sign == 1 ? '' : '-';

            return sign + hour + ':' + minute;
        }

        // Generic failure function
        var odoo_failure_function = function (response) {
            $scope.odoo_error = {
                'title': response.title || response.fullTrace.message,
                'type': response.fullTrace.data ? response.fullTrace.data.exception_type : 'ERROR exception unidentified',
                'message': response.fullTrace.data ? response.fullTrace.data.message : response.message,
            };
            var msg = `<b>${$scope.odoo_error['title']}</b><br/>
            <p style='color: red;'>${JSON.stringify($scope.odoo_error)}</p>`;
            alert.show(msg);
            return false;
        };

    }]);
