/*
    Copyright 2016 - 2022 Therp (http://therp.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

// Check valid urls
// NB: for localhost use e.g http://127.0.0.1:8069
function validURL(str) {
    console.log("Called >>>>>>>>>");
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

// Allow manuplation of elements
function get_element(value='', method='class') {
    var element = null;
    console.log(value);
    switch (method) {
        case "class":
            element = document.getElementsByClassName(value);
            break;
        case "id":
            element = document.getElementById(value);
            break;
        case "name":
            element = document.getElementsByName(value);
            break;
        case "tag":
            element = document.getElementsByTagName(value);
            break;
        default:
            alert.show("Error: argument '" + method + "' not supported!");
            break;
    }
    element = (element && element !== null && element !== undefined &&
        element.length) ? element : false;
    console.log("ELEMENT: " + element);
    return element;
}
