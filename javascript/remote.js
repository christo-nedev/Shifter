
var RPC = {
    daemonVersion: 'version',
    root: '../rpc',
    altSpeed: 'alt-speed-enabled'
};

function TransmissionRemote(controller) {
    this.initialize(controller);
    return this;
}

TransmissionRemote.prototype = {

    initialize: function (controller) {
        this.controller = controller;
        this.error = '';
        this.token = '';
    },

    sendRequest: function (data, callback) {
        var remote = this;
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {

            if (xhr.readyState == 4 && xhr.status == 200) {

                    callback(JSON.parse(xhr.responseText));
                return;
            }

            if (xhr.readyState == 4 && xhr.status == 409) {

                remote.token = xhr.getResponseHeader('X-Transmission-Session-Id');
                xhr.open('POST', RPC.root, true);
                xhr.setRequestHeader('X-Transmission-Session-Id', remote.token);
                xhr.send(JSON.stringify(data));
                return;
            }

            if (xhr.readyState == 4 && xhr.status != 200) {
                remote.error = xhr.responseText ? xhr.responseText.trim().replace(/(<([^>]+)>)/ig, "") : "";

                if (!remote.error.length) {
                    remote.error = 'Server not responding';
                }

                confirmBox.confirmBox('Connection Failed',
                   'Could not connect to the server. You may need to reload the page.',
                   'Dismiss',
                   'Details',
                    function () {
                        alert(this.error);
                    });

                remote.controller.togglePeriodicSessionRefresh(false);
            }
        }

        xhr.open('POST', RPC.root, true);
        xhr.setRequestHeader('X-Transmission-Session-Id', remote.token);
        xhr.send(JSON.stringify(data));
    },

    loadDaemonPrefs: function (callback, context, async) {
        var o = {
            method: 'session-get'
        };
        this.sendRequest(o, callback);
    },

    addTorrentByUrl: function (url, options) {
        var remote = this;
        if (url.match(/^[0-9a-f]{40}$/i)) {
            url = 'magnet:?xt=urn:btih:' + url;
        }
        var o = {
            method: 'torrent-add',
            arguments: {
                paused: (options.paused),
                filename: url
            }
        };
        this.sendRequest(o, function () {
            remote.controller.refreshTorrents();
        });
    },

    removeTorrents: function (torrents) {
        var remote = this;
        var o = {
            method: 'torrent-remove',
            arguments: {
                'delete-local-data': true,
                ids: []
            }
        };

        if (torrents) {
            for (var i = 0, len = torrents.length; i < len; ++i) {
                o.arguments.ids.push(torrents[i].getId());
            };
        };
        this.sendRequest(o, function () {
            remote.controller.refreshTorrents();
        });
    },

    updateTorrents: function (torrentIds, fields, callback, context) {
        var o = {
            method: 'torrent-get',
            arguments: {
                'fields': fields
            }
        };
        if (torrentIds) {
            o['arguments'].ids = torrentIds;
        };
        this.sendRequest(o, function (response) {
            var args = response['arguments'];
            callback.call(context, args.torrents, args.removed);
        });
    },

    sendTorrentSetRequests: function (method, torrent_ids, args, callback, context) {
        if (!args) {
            args = {};
        };
        args['ids'] = torrent_ids;
        var o = {
            method: method,
            arguments: args
        };
        this.sendRequest(o, callback);
    },

    sendTorrentActionRequests: function (method, torrent_ids, callback, context) {
        this.sendTorrentSetRequests(method, torrent_ids, null, callback, context);
    },

    startTorrents: function (torrent_ids, noqueue, callback, context) {
        var name = noqueue ? 'torrent-start-now' : 'torrent-start';
        this.sendTorrentActionRequests(name, torrent_ids, callback, context);
    },

    stopTorrents: function (torrent_ids, callback, context) {
        this.sendTorrentActionRequests('torrent-stop', torrent_ids, callback, context);
    },

    savePrefs: function (args) {
        var remote = this;
        var o = {
            method: 'session-set',
            arguments: args
        };
        this.sendRequest(o, function () {
            remote.controller.loadDaemonPrefs();
        });
    }

};
