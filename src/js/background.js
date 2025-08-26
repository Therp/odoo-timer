/*
    Copyright 2016 - 2022 Therp (https://therp.nl)
    License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
 */

var online = "it is online";
console.log(online);
var TogglButton = {
    setBrowserAction: function (timer) {
        console.log("TIMER CHECK:" + timer);
        if (timer === true) {
            var imagePath = {'19': 'img/icon_19.png', '38': 'img/icon_38.png'};
        }
        else if (timer === 'pause') {
            var imagePath = {'19': 'img/icon-pause.png', '38': 'img/icon-pause.png'};
        }
        else {
            var imagePath = {'19': 'img/inactive_19.png', '38': 'img/inactive_19.png'};
        }
        browser.action.setIcon({
	      path: imagePath,
	    });
	    console.log("works");
    },
};
browser.runtime.onMessage.addListener(async (msg, sender) => {
  console.log("BG page received message", msg, "from", sender);
  console.log("Stored data", await browser.storage.local.get());
  TogglButton.setBrowserAction(msg.TimerActive);
});


