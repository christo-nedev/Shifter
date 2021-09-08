
function TorrentRendererHelper() {}

TorrentRendererHelper.getProgressInfo = function (controller, t) {
    var pct, extra;
    var s = t.getStatus();
    var seedRatioLimit = t.seedRatioLimit(controller);

    if (t.needsMetaData()) {
        pct = t.getMetadataPercentComplete() * 100;
    } else if (!t.isDone()) {
        pct = Math.round(t.getPercentDone() * 100);
    } else if (seedRatioLimit > 0 && t.isSeeding()) {
        pct = Math.round(t.getUploadRatio() * 100 / seedRatioLimit);
    } else {
        pct = 100;
    };

    if (s === Torrent.StatusStopped) {
        extra = 'paused';
    } else if (s === Torrent.StatusDownloadWait) {
        extra = 'leeching queued';
    } else if (t.needsMetaData()) {
        extra = 'magnet';
    } else if (s === Torrent.StatusDownload) {
        extra = 'leeching';
    } else if (s === Torrent.StatusSeedWait) {
        extra = 'seeding queued';
    } else if (s === Torrent.StatusSeed) {
        extra = 'seeding';
    } else {
        extra = '';
    };

    return {
        percent: pct,
        complete: ['torrent-progressbar', 'complete', extra].join(' '),
        incomplete: ['torrent-progressbar', 'incomplete', extra].join(' ')
    };
};

TorrentRendererHelper.createProgressbar = function (classes) {
    var complete, incomplete, progressbar;

    complete = document.createElement('div');
    complete.className = 'torrent-progressbar complete';

    incomplete = document.createElement('div');
    incomplete.className = 'torrent-progressbar incomplete';

    progressbar = document.createElement('div');
    progressbar.className = 'torrent-progressbar-container ' + classes;
    progressbar.appendChild(complete);
    progressbar.appendChild(incomplete);

    return {
        'element': progressbar,
        'complete': complete,
        'incomplete': incomplete
    };
};

TorrentRendererHelper.renderProgressbar = function (controller, t, progressbar) {
    var e, style, width, display
    var info = TorrentRendererHelper.getProgressInfo(controller, t);

    e = progressbar.complete;
    style = e.style;
    width = '' + info.percent + '%';
    display = info.percent > 0 ? 'block' : 'none';

    if (style.width !== width || style.display !== display) {
        e.style.width = '' + info.percent + '%';
        e.style.display = display;

    };

    if (e.className !== info.complete) {
        e.className = info.complete;
    };

    e = progressbar.incomplete;
    display = (info.percent < 100) ? 'block' : 'none';

    if (e.style.display !== display) {
        e.style.display = display;
    };

    if (e.className !== info.incomplete) {
        e.className = info.incomplete;
    };
};

TorrentRendererHelper.formatUL = function (t) {
    return ' ↑ ' + Transmission.fmt.speedBps(t.getUploadSpeed());
};

TorrentRendererHelper.formatDL = function (t) {
    return ' ↓ ' + Transmission.fmt.speedBps(t.getDownloadSpeed());
};

TorrentRendererHelper.formatETA = function (t) {
    var eta = t.getETA();
    if (eta < 0 || eta >= (999 * 60 * 60)) {
        return "";
    };
    return "ETA: " + Transmission.fmt.timeInterval(eta);
};

function TorrentRenderer() {};

TorrentRenderer.prototype = {
    createRow: function () {
        var root, name, peers, progressbar, details, image, button;

        root = document.createElement('li');
        root.className = 'torrent';

        name = document.createElement('div');
        name.className = 'torrent-name';

        peers = document.createElement('div');
        peers.className = 'torrent-peers';

        progressbar = TorrentRendererHelper.createProgressbar('full');

        details = document.createElement('div');
        details.className = 'torrent-progress';

        image = document.createElement('div');
        button = document.createElement('a');
        button.appendChild(image);

        root.appendChild(name);
        root.appendChild(peers);
        root.appendChild(button);
        root.appendChild(progressbar.element);
        root.appendChild(details);

        root.name = name;
        root.peerDetails = peers;
        root.progressDetails = details;
        root.progressBar = progressbar;
        root.buttonImage = image;
        root.button = button;

        return root;
    },

    getPeerDetails: function (t) {
        var err,
            peerCount,
            webseedCount,
            fmt = Transmission.fmt;

        if ((err = t.getErrorMessage())) {
            return err;
        };

        if (t.isDownloading()) {
            peerCount = t.getPeersConnected();
            webseedCount = t.getWebSeedsSendingToUs();

            if (webseedCount && peerCount) {
                return ['Downloading from',
                    t.getPeersSendingToUs(),
                    'of',
                    fmt.countString('peer', 'peers', peerCount),
                    'and',
                    fmt.countString('web seed', 'web seeds', webseedCount),
                    '–',
                    TorrentRendererHelper.formatDL(t),
                    TorrentRendererHelper.formatUL(t)
                ].join(' ');
            } else if (webseedCount) {
                return ['Downloading from',
                    fmt.countString('web seed', 'web seeds', webseedCount),
                    '–',
                    TorrentRendererHelper.formatDL(t),
                    TorrentRendererHelper.formatUL(t)
                ].join(' ');
            } else {
                return ['Downloading from',
                    t.getPeersSendingToUs(),
                    'of',
                    fmt.countString('peer', 'peers', peerCount),
                    '–',
                    TorrentRendererHelper.formatDL(t),
                    TorrentRendererHelper.formatUL(t)
                ].join(' ');
            };
        };

        if (t.isSeeding()) {
            return ['Seeding to',
                t.getPeersGettingFromUs(),
                'of',
                fmt.countString('peer',
                'peers',
                t.getPeersConnected()),
                '-',
                TorrentRendererHelper.formatUL(t)
            ].join(' ');
        };

        if (t.isChecking()) {
            return ['Verifying local data (',
                Transmission.fmt.percentString(100.0 * t.getRecheckProgress()),
                '% tested)'
            ].join(' ');
        }

        return t.getStateString();
    },

    getProgressDetails: function (controller, t) {
        if (t.needsMetaData()) {
            var MetaDataStatus = "retrieving";
            if (t.isStopped()) {
                MetaDataStatus = "needs";
            };
            var percent = 100 * t.getMetadataPercentComplete();
            return ["Magnetized transfer - " + MetaDataStatus + " metadata (",
                Transmission.fmt.percentString(percent),
                "%)"
            ].join('');
        }

        var c;
        var sizeWhenDone = t.getSizeWhenDone();
        var totalSize = t.getTotalSize();
        var isDone = t.isDone() || t.isSeeding();

        if (isDone) {
            if (totalSize === sizeWhenDone) {
                c = [Transmission.fmt.size(totalSize)];
            } else {
                c = [Transmission.fmt.size(sizeWhenDone),
                    ' of ',
                    Transmission.fmt.size(t.getTotalSize()),
                    ' (',
                    t.getPercentDoneStr(),
                    '%)'
                ];
            };
            c.push(', uploaded ',
                Transmission.fmt.size(t.getUploadedEver()),
                ' (Ratio ',
                Transmission.fmt.ratioString(t.getUploadRatio()),
                ')');
        } else {
            c = [Transmission.fmt.size(sizeWhenDone - t.getLeftUntilDone()),
                ' of ', Transmission.fmt.size(sizeWhenDone),
                ' (', t.getPercentDoneStr(), '%)'
            ];
        };

        if (!t.isStopped() && (!isDone || t.seedRatioLimit(controller) > 0)) {
            c.push(' - ');
            var eta = t.getETA();
            if (eta < 0 || eta >= (999 * 60 * 60) /* arbitrary */ ) {
                c.push('remaining time unknown');
            } else {
                c.push(Transmission.fmt.timeInterval(t.getETA()), ' remaining');
            };
        };

        return c.join('');
    },

    render: function (controller, t, root) {
        setTextContent(root.name, t.getName());

        TorrentRendererHelper.renderProgressbar(controller, t, root.progressBar);

        var error = t.getError() !== Torrent.ErrNone;
        var e = root.peerDetails;
        e.classList.toggle('error', error);
        setTextContent(e, this.getPeerDetails(t));

        e = root.progressDetails;
        setTextContent(e, this.getProgressDetails(controller, t));

        var isStopped = t.isStopped();
        e = root.buttonImage;
        e.alt = isStopped ? 'Resume' : 'Pause';
        e.className = isStopped ? 'torrent-resume' : 'torrent-pause';
    }
};

function TorrentRow(view, controller, torrent) {
    this.initialize(view, controller, torrent);
};

TorrentRow.prototype = {

    initialize: function (view, controller, torrent) {
        var row = this;
        this.view = view;
        this.torrent = torrent;
        this.element = view.createRow();
        this.render(controller);


        this.torrent.dataChanged = function () { row.render(controller); };

    },

    getElement: function () {
        return this.element;
    },

    render: function (controller) {
        var tor = this.getTorrent();
        if (tor) {
            this.view.render(controller, tor, this.getElement());
        };
    },

    isSelected: function () {
        return this.getElement().className.indexOf('selected') !== -1;
    },

    getTorrent: function () {
        return this.torrent;
    },

    getTorrentId: function () {
        return this.getTorrent().getId();
    }
};
