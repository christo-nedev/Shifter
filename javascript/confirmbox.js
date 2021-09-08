
function ConfirmBox() {
    this.initialize();
};

ConfirmBox.prototype = {

    initialize: function () {

        this.container = document.getElementById('confirm-box-container');
        this.window = document.getElementById('confirm-box-window');
        this.title = document.getElementById('confirm-box-title');
        this.message = document.getElementById('confirm-box-message');
        this.cancel = document.getElementById('confirm-box-cancel');
        this.confirm = document.getElementById('confirm-box-confirm');
        this.callback = null;

        this.cancel.onclick = this.onCancelClicked.bind(this);
        this.confirm.onclick = this.onConfirmClicked.bind(this);
    },

    onCancelClicked: function (event) {
        document.body.classList.remove('visible');
        this.container.style.display = 'none';
        transmission.updateButtonStates();
    },

    onConfirmClicked: function (event) {
        this.callback();
        document.body.classList.remove('visible');
        this.container.style.display = 'none';
        transmission.updateButtonStates();
    },

    confirmBox: function (title, message, cancel, confirm, callback) {

        setTextContent(this.title, title);
        setTextContent(this.message, message);
        setTextContent(this.cancel, cancel || 'Cancel');
        setTextContent(this.confirm, confirm);

        this.confirm.style.display = 'initial';
        this.callback = callback;

        document.body.classList.add('visible');

        this.container.style.display = 'initial';
        transmission.updateButtonStates();
    }
};
