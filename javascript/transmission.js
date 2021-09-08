
var transmission,
    confirmBox,
    isMobileDevice = RegExp("(iPhone|iPod|Android)").test(navigator.userAgent),
    scroll_timeout;

function setTextContent(e, text) {
    if (e && (e.textContent != text)) {
        e.textContent = text;
    };
};

Number.prototype.toTruncFixed = function (place) {
    var ret = Math.floor(this * Math.pow(10, place)) / Math.pow(10, place);
    return ret.toFixed(place);
};

Number.prototype.toStringWithCommas = function() {
    return this.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
};

function Transmission() {
    this.initialize();
}

Transmission.prototype = {

    initialize: function () {

        this.elements = {};
        this.torrents = {};
        this.tmptorrents = {};
        this.rows = [];


        this.remote = new TransmissionRemote(this);
        this.torrentRenderer = new TorrentRenderer();

        this.elements.add = document.getElementById('toolbar-add');
        this.elements.remove = document.getElementById('toolbar-remove');
        this.elements.start = document.getElementById('toolbar-start');
        this.elements.stop = document.getElementById('toolbar-pause');
        this.elements.speed = document.getElementById('toolbar-speed');
        this.elements.dnspeed = document.getElementById('speed-dn-label');
        this.elements.upspeed = document.getElementById('speed-up-label');
        this.elements.torrents = document.getElementById('torrent-list');
        this.elements.uploadbox = document.getElementById('upload-box-container')
        this.elements.cancel = document.getElementById('upload-box-cancel');
        this.elements.confirm = document.getElementById('upload-box-confirm');

        this.elements.add.onclick = this.addClicked.bind(this);
        this.elements.remove.onclick = this.removeClicked.bind(this);
        this.elements.start.onclick = this.startClicked.bind(this);
        this.elements.stop.onclick = this.stopClicked.bind(this);
        this.elements.speed.onclick = this.speedClicked.bind(this);
        this.elements.cancel.onclick = this.cancelUploadClicked.bind(this);
        this.elements.confirm.onclick = this.confirmUploadClicked.bind(this);

        this.loadDaemonPrefs();
        this.updateAllTorrents();
        this.refreshTorrents();
    },

    loadDaemonPrefs: function () {
        this.remote.loadDaemonPrefs(function (data) {

            var o = data['arguments'];

            this.serverVersion = o.version;

            if (RPC.altSpeed in o) {

                var e = document.getElementById('toolbar-speed');
                var t = [(o[RPC.altSpeed] ? 'Disable' : 'Enable'),
                    ' Alternative Speed Limits'].join('');
                
                e.classList.toggle('selected', o[RPC.altSpeed]);
                e.setAttribute('title', t);
            }

            this.sessionProperties = o;

        }, this, false);
    },

    getAllTorrents: function () {
        var torrents = [];
        for (var key in this.torrents) {
            torrents.push(this.torrents[key]);
        };
        return torrents;
    },

    getTorrentIds: function (torrents) {
        return torrents.slice(0).map(function (t) {
            return t.getId();
        });
    },

    seedRatioLimit: function () {
        var p = this.sessionProperties;
        if (p && p.seedRatioLimited) {
            return p.seedRatioLimit;
        };
        return -1;
    },

    getSelectedRows: function () {
        var i, row;
        var rows = [];

        for (i=0; row=this.rows[i]; ++i) {
            if(row.isSelected()) 
            rows.push(row);
        }

        return rows;
    },

    getSelectedTorrents: function () {
        return this.getSelectedRows().map(function (r) {
            return r.getTorrent();
        });
    },

    selectRow: function (row) {
        row.getElement().classList.add('selected');
        this.updateButtonStates();
    },

    selectAllRows: function () {
        var i, row;
        var rows = [];

        for (i=0; row=this.rows[i]; ++i) {
            if(row.isSelected()) 
            this.selectRow(row);
        }
    },

    deselectRow: function (row) {
        row.getElement().classList.remove('selected');
        this.updateButtonStates();
    },

    deselectAllRows: function () {
        var i, row;
        var rows = [];

        for (i=0; row=this.rows[i]; ++i) {
            if(row.isSelected()) 
            this.deselectRow(row);
        }
    },

    isButtonEnabled: function (ev) {
        var p = (ev.target || ev.srcElement).parentNode;
        return p.className !== 'disabled' && p.parentNode.className !== 'disabled';
    },

    addClicked: function (ev) {
        if (this.isButtonEnabled(ev)) {
            this.uploadTorrentFile();
            this.updateButtonStates();
        }
    },

    removeClicked: function (ev) {
        if (this.isButtonEnabled(ev)) {
            this.removeSelectedTorrents();
            this.updateButtonStates();
        };
    },

    startClicked: function (ev) {
        if (this.isButtonEnabled(ev)) {
            this.startAllTorrents(false);
            this.updateButtonStates();
        }
    },

    stopClicked: function (ev) {
        if (this.isButtonEnabled(ev)) {
            this.stopAllTorrents();
            this.updateButtonStates();
        }
    },

    speedClicked: function () {
        var o = {};
        o[RPC.altSpeed] = !this.elements.speed.classList.contains('selected');
        this.remote.savePrefs(o);
    },

    onRowClicked: function (ev) {
        var row = ev.currentTarget.row;

        ev.stopPropagation();

        if (ev.target.className === 'torrent-resume') {
            this.startTorrent(row.getTorrent());
            return;
        }

        if (ev.target.className === 'torrent-pause') {
            this.stopTorrent(row.getTorrent());
            return;
        }

        if (row.isSelected()) {
            this.deselectRow(row);
        } else {
            this.deselectAllRows();
            this.selectRow(row);
        }
    },

    hideUploadDialog: function () {
        this.elements.uploadbox.style.display = 'none';
    },

    cancelUploadClicked: function () {
        this.hideUploadDialog();
    },

    confirmUploadClicked: function () {
        this.uploadTorrentFile(true);
        this.hideUploadDialog();
    },

    parseUpdates: function (updates, removedIds) {

        var i, e, o, t, id, row, needed, needinfo = [], callback, fields;

        for (i = 0; o = updates[i]; ++i) {
            id = o.id;

            if ((t = this.torrents[id])) {

                needed = t.needsMetaData();
                t.refresh(o);
                if (needed && !t.needsMetaData()) 
                    needinfo.push(id);
                
            } else {

                t = this.torrents[id] = new Torrent(o);
                this.tmptorrents[id] = true;

                if (!('name' in t.fields) || !('status' in t.fields))
                    needinfo.push(id);

            }
        }

        if (needinfo.length) {

            fields = ['id'].concat(Torrent.Fields.Metadata, Torrent.Fields.Stats);
            this.updateTorrents(needinfo, fields);

        }

        if (removedIds) {

            this.deleteTorrents(removedIds);

            for (i=0; row=this.rows[i]; ++i) {

              if(row.getTorrentId() in this.tmptorrents) 
              row.getElement().remove();

            }
        }

        for (id in this.tmptorrents) {

            t = this.torrents[id];

            if (t) {

                row = new TorrentRow(this.torrentRenderer, this, t);
                e = row.getElement();
                e.row = row;
                this.rows.push(row);

                e.onclick = this.onRowClicked.bind(this);

                this.elements.torrents.appendChild(e);

            }
        }

        this.tmptorrents = {};
        this.updateStatusbar();
        this.updateButtonStates();
    },

    updateTorrents: function (ids, fields) {
        var that = this;

        function f(updates, removedIds) {

            that.parseUpdates(updates, removedIds);

        }

        this.remote.updateTorrents(ids, fields, f);
    },

    updateAllTorrents: function () {
        var fields = ['id'].concat(Torrent.Fields.Metadata, Torrent.Fields.Stats);
        this.updateTorrents(null, fields);
    },

    refreshTorrents: function () {
        var callback = this.refreshTorrents.bind(this);
        var msec = 1000;
        var fields = ['id'].concat(Torrent.Fields.Stats);

        this.updateTorrents('recently-active', fields);

        clearTimeout(this.refreshTorrentsTimeout);
        this.refreshTorrentsTimeout = setTimeout(callback, msec);
    },

    uploadTorrentFile: function (confirmed) {
        var i, file, reader;
        var fileInput = document.getElementById('torrent-upload-file');
        var urlInput = document.getElementById('torrent-upload-url');

        if (!confirmed) {

            fileInput.value = '';
            urlInput.value = '';
            this.elements.uploadbox.style.display = 'initial';

        } else {

            var paused;
            var destination;
            var remote = this.remote;

            Array.from(fileInput.files).forEach(function (file, i) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var contents = e.target.result;
                    var key = "base64,"
                    var index = contents.indexOf(key);
                    if (index > -1) {
                        var metainfo = contents.substring(index + key.length);
                        var o = {
                            method: 'torrent-add',
                            arguments: {
                                'paused': paused,
                                'download-dir': destination,
                                'metainfo': metainfo
                            }
                        };
                        remote.sendRequest(o, function (response) {
                            if (response.result != 'success')
                                alert('Error adding "' + file.name + '": ' + response.result);
                        });
                    }
                };
                reader.readAsDataURL(file);
            });

            var url = urlInput.value;
            if (url != '') {
                if (url.match(/^[0-9a-f]{40}$/i)) {
                    url = 'magnet:?xt=urn:btih:' + url;
                };
                var o = {
                    'method': 'torrent-add',
                    arguments: {
                        'paused': paused,
                        'download-dir': destination,
                        'filename': url
                    }
                };
                remote.sendRequest(o, function (response) {
                    if (response.result != 'success') {
                        alert('Error adding "' + url + '": ' + response.result);
                    };
                });
            }
        }
    },

    deleteTorrents: function (ids) {
        var i, id;

        if (ids && ids.length) {
            for (i = 0; id = ids[i]; ++i) {
                this.tmptorrents[id] = true;
                delete this.torrents[id];
            };
        };
    },

    removeSelectedTorrents: function () {
        var torrents = this.getSelectedTorrents();
        if (torrents.length) {
            this.promptToRemoveTorrents(torrents);
        };
    },

    promptToRemoveTorrents: function (torrents) {
        if (torrents.length === 1) {
            var torrent = torrents[0];
            var header = 'Remove ' + torrent.getName() + ' and delete data?';
            var message = 'All data will be deleted. Are you sure you want to remove it?';

            confirmBox.confirmBox(header, message, 'Cancel', 'Remove', function () {
                transmission.removeTorrents(torrents);
            });
        } else {
            var header = 'Remove ' + torrents.length + ' transfers and delete data?';
            var message = 'All data will be deleted. Are you sure you want to remove them?';

            confirmBox.confirmBox(header, message, 'Cancel', 'Remove', function () {
                transmission.removeTorrents(torrents);
            });
        }
    },

    removeTorrents: function (torrents) {
        this.remote.removeTorrents(torrents);
    },

    startAllTorrents: function (force) {
        this.startTorrents(this.getAllTorrents(), force);
    },

    startSelectedTorrents: function (force) {
        this.startTorrents(this.getSelectedTorrents(), force);
    },

    startTorrent: function (torrent) {
        this.startTorrents([torrent], false);
    },

    startTorrents: function (torrents, force) {
        this.remote.startTorrents(this.getTorrentIds(torrents), force, this.parseUpdates, this);
    },

    stopAllTorrents: function () {
        this.stopTorrents(this.getAllTorrents());
    },

    stopSelectedTorrents: function () {
        this.stopTorrents(this.getSelectedTorrents());
    },

    stopTorrent: function (torrent) {
        this.stopTorrents([torrent]);
    },

    stopTorrents: function (torrents) {
        this.remote.stopTorrents(this.getTorrentIds(torrents), this.parseUpdates, this);
    },

    updateStatusbar: function () {
        var i, row;
        var u = 0;
        var d = 0;
        var fmt = Transmission.fmt;
        var torrents = this.getAllTorrents();

        for (i = 0; row = torrents[i]; ++i) {
            u += row.getUploadSpeed();
            d += row.getDownloadSpeed();
        }

        this.elements.dnspeed.textContent = fmt.speedBps(d);
        this.elements.upspeed.textContent = fmt.speedBps(u);

    },

    updateButtonStates: function () {
        var stats = {
            active: 0,
            paused: 0,
            total: 0,
            activeSel: 0,
            pausedSel: 0,
            queuedSel: 0,
            sel: 0
        };

        for (var i = 0, row; row = this.rows[i]; ++i) {
            var isStopped = row.getTorrent().isStopped();
            var isSelected = row.isSelected();
            var isQueued = row.getTorrent().isQueued();
            ++stats.total;
            if (!isStopped) {
                ++stats.active;
            };
            if (isStopped) {
                ++stats.paused;
            };
            if (isSelected) {
                ++stats.sel;
            };
            if (isSelected && !isStopped) {
                ++stats.activeSel;
            };
            if (isSelected && isStopped) {
                ++stats.pausedSel;
            };
            if (isSelected && isQueued) {
                ++stats.queuedSel;
            };
        };

        this.elements.remove.classList.toggle('disabled', !(stats.sel > 0));
        this.elements.start.classList.toggle('disabled', !(stats.paused > 0));
        this.elements.stop.classList.toggle('disabled', !(stats.active > 0));
    }
};

Transmission.fmt = (function () {
    var speed_K = 1000;
    var speed_B_str = 'B/s';
    var speed_K_str = 'kB/s';
    var speed_M_str = 'MB/s';
    var speed_G_str = 'GB/s';
    var speed_T_str = 'TB/s';

    var size_K = 1000;
    var size_B_str = 'B';
    var size_K_str = 'kB';
    var size_M_str = 'MB';
    var size_G_str = 'GB';
    var size_T_str = 'TB';

    var mem_K = 1024;
    var mem_B_str = 'B';
    var mem_K_str = 'KiB';
    var mem_M_str = 'MiB';
    var mem_G_str = 'GiB';
    var mem_T_str = 'TiB';

    return {

        percentString: function (x) {
            if (x < 10.0) {
                return x.toTruncFixed(2);
            } else if (x < 100.0) {
                return x.toTruncFixed(1);
            } else {
                return x.toTruncFixed(0);
            }
        },

        ratioString: function (x) {
            if (x === -1) {
                return "None";
            }
            if (x === -2) {
                return '&infin;';
            }
            return this.percentString(x);
        },

        size: function (bytes) {
            if (bytes < size_K) {
                return [bytes, size_B_str].join(' ');
            }

            var convertedSize;
            var unit;

            if (bytes < Math.pow(size_K, 2)) {
                convertedSize = bytes / size_K;
                unit = size_K_str;
            } else if (bytes < Math.pow(size_K, 3)) {
                convertedSize = bytes / Math.pow(size_K, 2);
                unit = size_M_str;
            } else if (bytes < Math.pow(size_K, 4)) {
                convertedSize = bytes / Math.pow(size_K, 3);
                unit = size_G_str;
            } else {
                convertedSize = bytes / Math.pow(size_K, 4);
                unit = size_T_str;
            }

            return convertedSize <= 9.995 ? [convertedSize.toTruncFixed(2), unit].join(' ') : [convertedSize.toTruncFixed(1), unit].join(' ');
        },

        speedBps: function (Bps) {
            return this.speed(this.toKBps(Bps));
        },

        toKBps: function (Bps) {
            return Math.floor(Bps / speed_K);
        },

        speed: function (KBps) {
            var speed = KBps;

            if (speed <= 999.95) { // 0 KBps to 999 K
                return [speed.toTruncFixed(0), speed_K_str].join(' ');
            }

            speed /= speed_K;

            if (speed <= 99.995) { // 1 M to 99.99 M
                return [speed.toTruncFixed(2), speed_M_str].join(' ');
            }
            if (speed <= 999.95) { // 100 M to 999.9 M
                return [speed.toTruncFixed(1), speed_M_str].join(' ');
            }

            speed /= speed_K;
            return [speed.toTruncFixed(2), speed_G_str].join(' ');
        },

        timeInterval: function (seconds) {
            var days = Math.floor(seconds / 86400),
                hours = Math.floor((seconds % 86400) / 3600),
                minutes = Math.floor((seconds % 3600) / 60),
                seconds = Math.floor(seconds % 60),
                d = days + ' ' + (days > 1 ? 'days' : 'day'),
                h = hours + ' ' + (hours > 1 ? 'hours' : 'hour'),
                m = minutes + ' ' + (minutes > 1 ? 'minutes' : 'minute'),
                s = seconds + ' ' + (seconds > 1 ? 'seconds' : 'second');

            if (days) {
                if (days >= 4 || !hours) {
                    return d;
                }
                return d + ', ' + h;
            }
            if (hours) {
                if (hours >= 4 || !minutes) {
                    return h;
                }
                return h + ', ' + m;
            }
            if (minutes) {
                if (minutes >= 4 || !seconds) {
                    return m;
                }
                return m + ', ' + s;
            }
            return s;
        },

        ngettext: function (msgid, msgid_plural, n) {
            return n === 1 ? msgid : msgid_plural;
        },

        countString: function (msgid, msgid_plural, n) {
            return [ n.toStringWithCommas(), this.ngettext(msgid,msgid_plural,n) ].join(' ');
        }
    }
})();

function contentLoaded() {
    confirmBox = new ConfirmBox();
    transmission = new Transmission();
};

document.addEventListener("DOMContentLoaded", contentLoaded);
