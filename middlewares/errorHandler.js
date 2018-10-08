const http = require(`http`);

module.exports = function(err, req, res, next) {
    if (typeof err === 'number') {
        err = {status: err};
    }

	let { status = 500, message = http.STATUS_CODES[status] || `Server Error`} = err;

	return res
		.status(status)
		.json({ message });
}