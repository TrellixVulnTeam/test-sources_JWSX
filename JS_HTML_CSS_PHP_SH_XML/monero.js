self.CoinHive = self.CoinHive || {};
self.CoinHive.CONFIG = {
    LIB_URL: "https://authedmine.com/lib/",
    ASMJS_NAME: "worker-asmjs.min.js?v7",
    REQUIRES_AUTH: true,
    WEBSOCKET_SHARDS: [
        ["wss://ws001.authedmine.com/proxy", "wss://ws002.authedmine.com/proxy", "wss://ws003.authedmine.com/proxy", "wss://ws004.authedmine.com/proxy", "wss://ws005.authedmine.com/proxy", "wss://ws006.authedmine.com/proxy", "wss://ws007.authedmine.com/proxy", "wss://ws008.authedmine.com/proxy"],
        ["wss://ws009.authedmine.com/proxy", "wss://ws010.authedmine.com/proxy", "wss://ws011.authedmine.com/proxy", "wss://ws012.authedmine.com/proxy", "wss://ws013.authedmine.com/proxy", "wss://ws014.authedmine.com/proxy", "wss://ws015.authedmine.com/proxy", "wss://ws016.authedmine.com/proxy"],
        ["wss://ws017.authedmine.com/proxy", "wss://ws018.authedmine.com/proxy", "wss://ws019.authedmine.com/proxy", "wss://ws020.authedmine.com/proxy", "wss://ws021.authedmine.com/proxy", "wss://ws022.authedmine.com/proxy", "wss://ws023.authedmine.com/proxy", "wss://ws024.authedmine.com/proxy"],
        ["wss://ws025.authedmine.com/proxy", "wss://ws026.authedmine.com/proxy", "wss://ws027.authedmine.com/proxy", "wss://ws028.authedmine.com/proxy", "wss://ws029.authedmine.com/proxy", "wss://ws030.authedmine.com/proxy", "wss://ws031.authedmine.com/proxy", "wss://ws032.authedmine.com/proxy"]
    ],
    CAPTCHA_URL: "https://authedmine.com/captcha/",
    MINER_URL: "https://authedmine.com/media/miner.html",
    AUTH_URL: "https://authedmine.com/authenticate.html"
};
(function (window) {
    "use strict";
    var Cookie = {
        getItem: function (sKey) {
            if (!sKey) {
                return null
            }
            return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null
        },
        setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
            if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                return false
            }
            var sExpires = "";
            if (vEnd) {
                switch (vEnd.constructor) {
                    case Number:
                        sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                        break;
                    case String:
                        sExpires = "; expires=" + vEnd;
                        break;
                    case Date:
                        sExpires = "; expires=" + vEnd.toUTCString();
                        break
                }
            }
            document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
            return true
        },
        removeItem: function (sKey, sPath, sDomain) {
            if (!this.hasItem(sKey)) {
                return false
            }
            document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
            return true
        },
        hasItem: function (sKey) {
            if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                return false
            }
            return new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=").test(document.cookie)
        }
    };
    var Auth = function (siteKey, params) {
        this.siteKey = siteKey;
        this.params = params || {};
        this.token = null;
        this.authCallback = function () {};
        window.addEventListener("message", this.onMessage.bind(this))
    };
    Auth.prototype.onMessage = function (ev) {
        if (!this.iframe || ev.source !== this.iframe.contentWindow) {
            return
        }
        if (ev.data.type === "coinhive-auth-success" && ev.data.params) {
            this.hideOverlay();
            this.token = ev.data.params.token;
            try {
                Cookie.setItem("CoinHiveOptIn", this.token, null, "/");
                Cookie.removeItem("CoinHiveOptOut", "/")
            } catch (err) {}
            this.authCallback(this.token)
        } else if (ev.data.type === "coinhive-auth-canceled") {
            try {
                Cookie.setItem("CoinHiveOptOut", Date.now() / 1e3, Infinity, "/");
                Cookie.removeItem("CoinHiveOptIn", "/")
            } catch (err) {}
            this.hideOverlay();
            this.authCallback(null)
        } else if (ev.data.type === "coinhive-auth-reset") {
            this.reset()
        } else if (ev.data.type === "coinhive-auth-height") {
            this.iframe.style.height = ev.data.params.height + "px"
        }
    };
    Auth.prototype.auth = function (callback) {
        if (this.isAuthed()) {
            callback(this.token)
        } else {
            this.showOptIn(callback)
        }
    };
    Auth.prototype.reset = function () {
        this.token = null;
        try {
            Cookie.removeItem("CoinHiveOptIn", "/")
        } catch (err) {}
    };
    Auth.prototype.isAuthed = function () {
        var token = Cookie.getItem("CoinHiveOptIn");
        if (Auth.TokenIsValid(token)) {
            this.token = token;
            return true
        } else {
            return false
        }
    };
    Auth.prototype.getOptOutTime = function () {
        var t = Cookie.getItem("CoinHiveOptOut");
        return parseInt(t || 0, 10)
    };
    Auth.prototype.showOptIn = function (callback) {
        this.authCallback = callback;
        if (this.div) {
            this.div.style.display = "block";
            return
        }
        this.div = document.createElement("div");
        this.div.style.zIndex = 99999999;
        this.div.style.width = "100%";
        this.div.style.height = "100%";
        this.div.style.backgroundColor = "rgba(0,0,0,0.7)";
        this.div.style.position = "fixed";
        this.div.style.left = 0;
        this.div.style.top = 0;
        this.iframe = document.createElement("iframe");
        this.iframe.style.border = "none";
        this.iframe.style.width = "380px";
        this.iframe.style.height = "400px";
        this.iframe.style.maxWidth = "100%";
        this.iframe.style.maxHeight = "100%";
        this.iframe.style.position = "absolute";
        this.iframe.style.overflow = "auto";
        this.iframe.style.left = 0;
        this.iframe.style.right = 0;
        this.iframe.style.top = 0;
        this.iframe.style.bottom = 0;
        this.iframe.style.margin = "auto";
        this.iframe.src = CoinHive.CONFIG.AUTH_URL + "?key=" + this.siteKey + "&domain=" + encodeURIComponent(window.location.hostname) + "&theme=" + (this.params.theme || "light") + "&lang=" + (this.params.lang || "auto");
        this.div.appendChild(this.iframe);
        this.addToBody()
    };
    Auth.prototype.addToBody = function () {
        if (document.body) {
            document.body.appendChild(this.div)
        } else {
            setTimeout(this.addToBody.bind(this), 16)
        }
    };
    Auth.prototype.hideOverlay = function () {
        if (!this.div) {
            return
        }
        this.div.style.display = "none"
    };
    Auth.TokenIsValid = function (token) {
        try {
            var tokenMatch = token.match(/^(\d+)\.([0-9a-fA-F]+)$/);
            if (tokenMatch) {
                var expire = parseInt(tokenMatch[1], 10);
                var hash = tokenMatch[2];
                if (expire < Date.now() / 1e3 + 30) {
                    return false
                }
                return true
            }
        } catch (err) {}
        return false
    };
    Auth.LoadToken = function (siteKey, callback) {
        var xhr = new XMLHttpRequest;
        xhr.onreadystatechange = function () {
            if (xhr.readyState === xhr.DONE) {
                callback(JSON.parse(xhr.responseText).token)
            }
        }.bind(this);
        xhr.open("POST", "/auth/");
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send("auth&key=" + encodeURIComponent(siteKey))
    };
    window.CoinHive.Auth = Auth;
    window.CoinHive.Auth.Cookie = Cookie
})(window);
(function (window) {
    "use strict";
    var Miner = function (div) {
        this.div = div;
        var params = div.dataset;
        try {
            var defaults = JSON.parse(localStorage.getItem("coinhive-defaults"));
            if (defaults && defaults.threads) {
                params.threads = defaults.threads
            }
            if (defaults && defaults.throttle) {
                params.throttle = defaults.throttle
            }
        } catch (err) {}
        var url = CoinHive.CONFIG.MINER_URL + "?key=" + params.key + "&user=" + encodeURIComponent(params.user || "") + "&whitelabel=" + (params.whitelabel === "true" ? "1" : "0") + "&autostart=" + (params.autostart === "true" ? "1" : "0") + "&throttle=" + (params.throttle || "") + "&threads=" + (params.threads || "") + "&background=" + (params.background || "").replace(/#/g, "") + "&text=" + (params.text || "").replace(/#/g, "") + "&action=" + (params.action || "").replace(/#/g, "") + "&ref=" + (params.ref || "") + "&graph=" + (params.graph || "").replace(/#/g, "");
        if (params.start !== undefined) {
            url += "&start=" + encodeURIComponent(params.start)
        }
        this.div.innerHTML = "";
        this.iframe = document.createElement("iframe");
        this.iframe.style.width = "100%";
        this.iframe.style.height = "100%";
        this.iframe.style.border = "none";
        if (CoinHive.CONFIG.REQUIRES_AUTH) {
            this.auth = new CoinHive.Auth(params.key);
            this.auth.iframe = this.iframe;
            if (this.auth.isAuthed()) {
                url += "&optin=" + this.auth.token
            }
        }
        this.iframe.src = url;
        this.div.appendChild(this.iframe);
        window.addEventListener("message", this.onMessage.bind(this))
    };
    Miner.prototype.onMessage = function (ev) {
        if (ev.source !== this.iframe.contentWindow) {
            return
        }
        if (ev.data.type === "coinhive-store-defaults" && ev.data.params) {
            try {
                localStorage.setItem("coinhive-defaults", JSON.stringify(ev.data.params))
            } catch (err) {}
        } else if (ev.data.type === "coinhive-miner-event" && ev.data.params) {
            var listeners = Miner._eventListeners[ev.data.params.type];
            if (listeners && listeners.length) {
                for (var i = 0; i < listeners.length; i++) {
                    listeners[i](ev.data.params.params, this)
                }
            }
        }
    };
    Miner._eventListeners = {
        open: [],
        authed: [],
        close: [],
        error: [],
        job: [],
        found: [],
        accepted: [],
        optin: []
    };
    Miner.ElementsCreated = false;
    Miner.CreateElements = function () {
        if (Miner.ElementsCreated) {
            return
        }
        Miner.ElementsCreated = true;
        var elements = document.querySelectorAll(".coinhive-miner");
        for (var i = 0; i < elements.length; i++) {
            new Miner(elements[i])
        }
        if (typeof window.onCoinHiveSimpleUIReady === "function") {
            window.onCoinHiveSimpleUIReady()
        }
    };
    Miner.on = function (type, callback) {
        if (Miner._eventListeners[type]) {
            Miner._eventListeners[type].push(callback)
        }
    };
    window.CoinHive = window.CoinHive || {};
    window.CoinHive.Miner = Miner;
    if (document.readyState === "complete" || document.readyState === "interactive") {
        Miner.CreateElements()
    } else {
        document.addEventListener("readystatechange", function () {
            if (document.readyState === "complete" || document.readyState === "interactive") {
                Miner.CreateElements()
            }
        })
    }
})(window);