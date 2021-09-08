function Torrent(data) {
    this.initialize(data);
};

Torrent.StatusStopped = 0;
Torrent.StatusCheckWait = 1;
Torrent.StatusCheck = 2;
Torrent.StatusDownloadWait = 3;
Torrent.StatusDownload = 4;
Torrent.StatusSeedWait = 5;
Torrent.StatusSeed = 6;

Torrent.RatioUseGlobal = 0;
Torrent.RatioUseLocal = 1;
Torrent.RatioUnlimited = 2;

Torrent.ErrNone = 0;
Torrent.ErrTrackerWarning = 1;
Torrent.ErrTrackerError = 2;
Torrent.ErrLocalError = 3;

Torrent.TrackerInactive = 0;
Torrent.TrackerWaiting = 1;
Torrent.TrackerQueued = 2;
Torrent.TrackerActive = 3;

Torrent.Fields = {};

Torrent.Fields.Metadata = [
    'addedDate',
    'name',
    'totalSize'
];

Torrent.Fields.Stats = [
    'error',
    'errorString',
    'eta',
    'isFinished',
    'isStalled',
    'leftUntilDone',
    'metadataPercentComplete',
    'peersConnected',
    'peersGettingFromUs',
    'peersSendingToUs',
    'percentDone',
    'queuePosition',
    'rateDownload',
    'rateUpload',
    'recheckProgress',
    'seedRatioMode',
    'seedRatioLimit',
    'sizeWhenDone',
    'status',
    'trackers',
    'downloadDir',
    'uploadedEver',
    'uploadRatio',
    'webSeedsSendingToUs'
];

Torrent.prototype = {
    initialize: function (data) {
        this.fields = {};
        this.fieldObservers = {};
        this.refresh(data);
    },

    setField: function (o, name, value) {
        var i, observer;

        if (o[name] === value) {
            return false;
        };
        if (o == this.fields && this.fieldObservers[name] && this.fieldObservers[name].length) {
            for (i = 0; observer = this.fieldObservers[name][i]; ++i) {
                observer.call(this, value, o[name], name);
            };
        };
        o[name] = value;
        return true;
    },

    updateFiles: function (files) {
        var changed = false;
        var myfiles = this.fields.files || [];
        var keys = ['length', 'name', 'bytesCompleted', 'wanted', 'priority'];
        var i, f, j, key, myfile;

        for (i = 0; f = files[i]; ++i) {
            myfile = myfiles[i] || {};
            for (j = 0; key = keys[j]; ++j) {
                if (key in f) {
                    changed |= this.setField(myfile, key, f[key]);
                };
            };
            myfiles[i] = myfile;
        }
        this.fields.files = myfiles;
        return changed;
    },

    refreshFields: function (data) {
        var key;
        var changed = false;

        for (key in data) {
            switch (key) {
            case 'files':
            case 'fileStats':
                changed |= this.updateFiles(data[key]);
                break;
            case 'trackerStats':
                changed |= this.setField(this.fields, 'trackers', data[key]);
                break;
            case 'trackers':
                if (!(key in this.fields)) {
                    changed |= this.setField(this.fields, key, data[key]);
                };
                break;
            default:
                changed |= this.setField(this.fields, key, data[key]);
            };
        };

        return changed;
    },

    dataChanged: function (data)
    {
    },

    refresh: function (data) {
        if (this.refreshFields(data)) {
            this.dataChanged(this);
        };
    },

    getComment: function () {
        return this.fields.comment;
    },

    getCreator: function () {
        return this.fields.creator;
    },

    getDateAdded: function () {
        return this.fields.addedDate;
    },

    getDateCreated: function () {
        return this.fields.dateCreated;
    },

    getDesiredAvailable: function () {
        return this.fields.desiredAvailable;
    },

    getDownloadDir: function () {
        return this.fields.downloadDir;
    },

    getDownloadSpeed: function () {
        return this.fields.rateDownload;
    },

    getDownloadedEver: function () {
        return this.fields.downloadedEver;
    },

    getError: function () {
        return this.fields.error;
    },

    getErrorString: function () {
        return this.fields.errorString;
    },

    getETA: function () {
        return this.fields.eta;
    },

    getFailedEver: function (i) {
        return this.fields.corruptEver;
    },

    getFile: function (i) {
        return this.fields.files[i];
    },

    getFileCount: function () {
        return this.fields.files ? this.fields.files.length : 0;
    },

    getHashString: function () {
        return this.fields.hashString;
    },

    getHave: function () {
        return this.getHaveValid() + this.getHaveUnchecked()
    },

    getHaveUnchecked: function () {
        return this.fields.haveUnchecked;
    },

    getHaveValid: function () {
        return this.fields.haveValid;
    },

    getId: function () {
        return this.fields.id;
    },

    getLastActivity: function () {
        return this.fields.activityDate;
    },

    getLeftUntilDone: function () {
        return this.fields.leftUntilDone;
    },

    getMetadataPercentComplete: function () {
        return this.fields.metadataPercentComplete;
    },

    getName: function () {
        return this.fields.name || 'Unknown';
    },

    getPeers: function () {
        return this.fields.peers;
    },

    getPeersConnected: function () {
        return this.fields.peersConnected;
    },

    getPeersGettingFromUs: function () {
        return this.fields.peersGettingFromUs;
    },

    getPeersSendingToUs: function () {
        return this.fields.peersSendingToUs;
    },

    getPieceCount: function () {
        return this.fields.pieceCount;
    },

    getPieceSize: function () {
        return this.fields.pieceSize;
    },

    getPrivateFlag: function () {
        return this.fields.isPrivate;
    },

    getQueuePosition: function () {
        return this.fields.queuePosition;
    },

    getRecheckProgress: function () {
        return this.fields.recheckProgress;
    },

    getSeedRatioLimit: function () {
        return this.fields.seedRatioLimit;
    },

    getSeedRatioMode: function () {
        return this.fields.seedRatioMode;
    },

    getSizeWhenDone: function () {
        return this.fields.sizeWhenDone;
    },

    getStartDate: function () {
        return this.fields.startDate;
    },

    getStatus: function () {
        return this.fields.status;
    },

    getTotalSize: function () {
        return this.fields.totalSize;
    },

    getTrackers: function () {
        return this.fields.trackers;
    },

    getUploadSpeed: function () {
        return this.fields.rateUpload;
    },

    getUploadRatio: function () {
        return this.fields.uploadRatio;
    },

    getUploadedEver: function () {
        return this.fields.uploadedEver;
    },

    getWebSeedsSendingToUs: function () {
        return this.fields.webSeedsSendingToUs;
    },

    isFinished: function () {
        return this.fields.isFinished;
    },

    hasExtraInfo: function () {
        return 'hashString' in this.fields;
    },

    isSeeding: function () {
        return this.getStatus() === Torrent.StatusSeed;
    },

    isStopped: function () {
        return this.getStatus() === Torrent.StatusStopped;
    },

    isChecking: function () {
        return this.getStatus() === Torrent.StatusCheck;
    },

    isDownloading: function () {
        return this.getStatus() === Torrent.StatusDownload;
    },

    isQueued: function () {
        return this.getStatus() === Torrent.StatusDownloadWait || this.getStatus() === Torrent.StatusSeedWait;
    },

    isDone: function () {
        return this.getLeftUntilDone() < 1;
    },

    needsMetaData: function () {
        return this.getMetadataPercentComplete() < 1;
    },

    getActivity: function () {
        return this.getDownloadSpeed() + this.getUploadSpeed();
    },

    getPercentDoneStr: function () {
        return Transmission.fmt.percentString(100 * this.getPercentDone());
    },

    getPercentDone: function () {
        return this.fields.percentDone;
    },

    getStateString: function () {
        switch (this.getStatus()) {
        case Torrent.StatusStopped:
            return this.isFinished() ? 'Seeding complete' : 'Paused';
        case Torrent.StatusCheckWait:
            return 'Queued for verification';
        case Torrent.StatusCheck:
            return 'Verifying local data';
        case Torrent.StatusDownloadWait:
            return 'Queued for download';
        case Torrent.StatusDownload:
            return 'Downloading';
        case Torrent.StatusSeedWait:
            return 'Queued for seeding';
        case Torrent.StatusSeed:
            return 'Seeding';
        case null:
        case undefined:
            return 'Unknown';
        default:
            return 'Error';
        }
    },

    seedRatioLimit: function (controller) {
        switch (this.getSeedRatioMode()) {
        case Torrent.RatioUseGlobal:
            return controller.seedRatioLimit();
        case Torrent.RatioUseLocal:
            return this.getSeedRatioLimit();
        default:
            return -1;
        }
    },

    getErrorMessage: function () {
        var str = this.getErrorString();
        switch (this.getError()) {
        case Torrent.ErrTrackerWarning:
            return 'Tracker returned a warning: ' + str;
        case Torrent.ErrTrackerError:
            return 'Tracker returned an error: ' + str;
        case Torrent.ErrLocalError:
            return 'Error: ' + str;
        default:
            return null;
        }
    }
};
