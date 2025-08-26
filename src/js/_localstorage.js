/*
    Copyright 2016 - 2022 Therp (http://therp.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

var storage = {};

/* Using browser.polyfill lib */
if (browser.storage && browser.storage.local) {
    storage.getItem = function (key, callback) {
        browser.storage.local.get(key).then(function (obj) {
            if (obj.hasOwnProperty(key)) {
                callback(obj[key]);
            } else {
                callback(null);
            }
        });
    };

    storage.setItem = function (key, value) {
        var obj = {};
        obj[key] = value;
        browser.storage.local.set(obj).then(function () {});
    };

    storage.removeItem = function (key) {
        browser.storage.local.remove(key);
    };

    storage.clear = function () {
        browser.storage.local.clear();
    };

} else {

    /* Test for local storage */
    function lsTest () {
        var test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /* Use normal local storage */
    if (lsTest() === true) {
        storage.getItem = function (key, callback) {
            value = localStorage.getItem(key);
            callback(value);
        };

        storage.setItem = function (key, value) {
            localStorage.setItem(key, value);
        };

        storage.removeItem = function (key) {
            localStorage.removeItem(key);
        };

        storage.clear = function () {
            localStorage.clear();
        };
    }

    /* Use dummy functions */
    else {
        function noop () {}
        storage = {
            getItem: noop,
            setItem: noop,
            clear: noop,
            removeItem: noop,
            getAllKeys: noop,
        };
    }

}
