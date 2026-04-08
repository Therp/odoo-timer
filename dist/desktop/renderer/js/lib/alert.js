//Created by Aaron Längert

(function() {

    var visible = false;
    var queue = [];
    var alertBox, alertDropShadow;

    window.addEventListener("load", function() {

        //import ripple library if not found
        if (typeof(ripple) == "undefined") {
            el = document.createElement("script");
            el.src = "node_modules/ripple-js/ripple.min.js";
            document.head.appendChild(el);
        }

        //Add styles & elements
        css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = "#alertBox{position:absolute;left:50%;top:50%;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);max-height:90vh;max-width:95vw;z-index:5;background:#F5F5F5;box-shadow:0 0 10px 0 rgba(0,0,0,.7);-webkit-animation:alertoutro .3s cubic-bezier(.4,0,1,1);animation:alertoutro .3s cubic-bezier(.4,0,1,1);overflow:hidden}#alertBox[show]{-webkit-animation:alertintro .3s cubic-bezier(0,0,.2,1);animation:alertintro .3s cubic-bezier(0,0,.2,1)}#alertDropShadow[show]{transition:opacity .3s cubic-bezier(0,0,.2,1);opacity:1;pointer-events:all}#alertDropShadow{transition:opacity .3s cubic-bezier(.4,0,1,1);position:absolute;left:0;top:0;bottom:0;width:100%;pointer-events:none;opacity:0;background:rgba(0,0,0,.65);z-index:4}#alertBox>.body{padding:20px;box-sizing:border-box;max-height:calc(90vh - 30px);overflow:auto}#alertBox>.actionfooter{padding:0 10px 0 30px;overflow:auto;width:100%;box-sizing:border-box;display:-webkit-flex;display:-ms-flexbox;display:flex}#alertBox>.actionfooter>.button{height:32px;padding:0 10px;margin:0 10px 0 auto;cursor:pointer;box-sizing:content-box;font:700 18px/32px Arial,Helvetica,sans-serif}.noSelect{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}@-webkit-keyframes alertoutro{from{display:block!important;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);opacity:1}to{display:block!important;-webkit-transform:translate(-50%,calc(-50% + 50px));transform:translate(-50%,calc(-50% + 50px));opacity:0}}@keyframes alertoutro{from{display:block!important;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);opacity:1}to{display:block!important;-webkit-transform:translate(-50%,calc(-50% + 50px));transform:translate(-50%,calc(-50% + 50px));opacity:0}}@-webkit-keyframes alertintro{0%{-webkit-transform:translate(-50%,calc(-50% - 100px));transform:translate(-50%,calc(-50% - 100px));opacity:0}30%{opacity:0}100%{-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);opacity:1}}@keyframes alertintro{0%{-webkit-transform:translate(-50%,calc(-50% - 100px));transform:translate(-50%,calc(-50% - 100px));opacity:0}30%{opacity:0}100%{-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);opacity:1}}";
        document.head.appendChild(css);

        el = document.createElement("div");
        el.id = "alertBox";
        el.innerHTML = "<div class='body' align='center'></div><div class='actionfooter'></div>";
        el.style.display = "none";
        document.body.appendChild(el);

        el = document.createElement("div");
        el.id = "alertDropShadow";
        document.body.appendChild(el);

        alertBox = document.getElementById("alertBox");
        alertDropShadow = document.getElementById("alertDropShadow");

        alertBox.addEventListener("animationend", function(e) {
            if (!e.target.hasAttribute("show")) {
                e.target.style.display = "none";
                visible = false;
                if (queue.length > 0) {
                    //show next alert in queue, if there is any
                    alert.show(queue[0].text, queue[0].actions, queue[0].options);
                    queue.shift();
                }
            }
        });
    });

    //esc & enter key press detection
    document.addEventListener("keydown", function(e) {
        if (e.keyCode == 27 && alert.open) {
            alert.hide();
        }
        if (e.keyCode == 13 && alert.open) {
            ripple.ripple(alertBox.childNodes[1].lastChild);
        }
    });

    function getTextWidth(txt) {
        canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        context = canvas.getContext("2d");
        context.font = "bold 18px/32px Arial, Helvetica, sans-serif";
        metrics = context.measureText(txt);
        return metrics.width;
    };


    alert.accentColor = "orange";
    alert.rippleOpacity = 0.6;
    alert.ripplePressExpandTime = 1.5;
    alert.rippleReleaseExpandTime = 0.3;
    alert.rippleLeaveCollapseTime = 0.4;
    alert.open = false;

    alert.show = function(text, actions, options, mode) {
        if (mode == "replace") {
            //if mode replace, clear the queue and show the new instantly
            alert.clearQueue();
            queue.push({ "text": text, "actions": actions, "options": options });
            alert.hide();
            return new Promise(
                function(resolve) {
                    alertBox.addEventListener("ripple-button-click", function(e) {
                        alert.hide();
                        resolve(e.target.innerText);
                    }, true);
                }
            );
        }

        if (mode == "next-in-queue") {
            //if mode next-in-queue, put the alert as the next on in the queue
            queue.unshift({ "text": text, "actions": actions, "options": options });
            return new Promise(
                function(resolve) {
                    alertBox.addEventListener("ripple-button-click", function(e) {
                        alert.hide();
                        resolve(e.target.innerText);
                    }, true);
                }
            );
        }

        if (mode == "next") {
            //if mode next, the show the new alert instantly, but also preserve the queue
            queue.unshift({ "text": text, "actions": actions, "options": options });
            alert.hide();
            return new Promise(
                function(resolve) {
                    alertBox.addEventListener("ripple-button-click", function(e) {
                        alert.hide();
                        resolve(e.target.innerText);
                    }, true);
                }
            );
        }

        if (visible) {
            //if a show is called while an alert ist still open and no mode is set, add the alert to the queue
            alertDropShadow.setAttribute("show", "");
            queue.push({ "text": text, "actions": actions, "options": options });
            return new Promise(
                function(resolve) {
                    alertBox.addEventListener("ripple-button-click", function(e) {
                        alert.hide();
                        resolve(e.target.innerText);
                    }, true);
                }
            );
        }
        visible = true;

        alertBox.childNodes[0].innerHTML = text;
        while (alertBox.childNodes[1].firstChild) {
            alertBox.childNodes[1].removeChild(alertBox.childNodes[1].firstChild);
        }

        //if actions is empty, add an "OK" button
        if (!actions || actions.length == 0) {
            actions = ["OK"];
        }

        //generate the buttons
        for (i in actions) {
            el = document.createElement("div");
            el.className = "button ripple noSelect";
            el.style.color = options ? options.accentColor || alert.accentColor : alert.accentColor;
            el.setAttribute("ripple-color", (options ? options.accentColor || alert.accentColor : alert.accentColor));
            el.setAttribute("ripple-opacity", (options ? ((typeof(options.rippleOpacity) != "undefined") ? options.rippleOpacity : alert.rippleOpacity) : alert.rippleOpacity));
            el.setAttribute("ripple-press-expand-time", (options ? ((typeof(options.ripplePressExpandTime) != "undefined") ? options.ripplePressExpandTime : alert.ripplePressExpandTime) : alert.ripplePressExpandTime));
            el.setAttribute("ripple-release-expand-time", (options ? ((typeof(options.rippleReleaseExpandTime) != "undefined") ? options.rippleReleaseExpandTime : alert.rippleReleaseExpandTime) : alert.rippleReleaseExpandTime));
            el.setAttribute("ripple-leave-collapse-time", (options ? ((typeof(options.rippleLeaveCollapseTime) != "undefined") ? options.rippleLeaveCollapseTime : alert.rippleLeaveCollapseTime) : alert.rippleLeaveCollapseTime));

            el.setAttribute("ripple-cancel-on-move", "");

            el.innerHTML = actions[i];
            el.style.minWidth = getTextWidth(actions[i]) + "px";
            alertBox.childNodes[1].appendChild(el);
        }

        ripple.registerRipples();

        alertBox.style.display = "block";
        alertBox.setAttribute("show", "");
        alertDropShadow.setAttribute("show", "");
        alert.open = true;

        return new Promise(
            function(resolve) {
                alertBox.addEventListener("ripple-button-click", function(e) {
                    alert.hide();
                    resolve(e.target.innerText);
                }, true);
            }
        );
    }

    //hides an open alert
    alert.hide = function() {
        alertBox.removeAttribute("show");
        alert.open = false;
        if (queue.length == 0) {
            alertDropShadow.removeAttribute("show");
        }
    }

    //clear the queue
    alert.clearQueue = function() {
        queue = [];
    }

})();
