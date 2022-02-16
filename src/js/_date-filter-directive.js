/*
    Copyright 2016 - 2022 Sunflower IT (http://sunflowerweb.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

screenApp.filter("asDate", function () {
    return function (input) {
        if (input) {
            return new Date(input);
        }
        return '';
    };
});
