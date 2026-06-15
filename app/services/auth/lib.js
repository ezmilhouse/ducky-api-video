const crypto = require('crypto')

// LIB

const _getHeader = function(headers, header_name) {
    const header_name_lc = header_name.toLowerCase()

    for (const key in headers || {}) {
        if (key.toLowerCase() === header_name_lc) {
            return headers[key]
        }
    }

    return null
}

const _getUrl = function(req) {
    let str = ''
    str += req.protocol + '://'
    str += req.get('host')
    str += req.originalUrl

    return str
}

const _newFingerprint = function(client_key, client_ua) {
    let str = ''
    str += client_key
    str += client_ua

    return crypto.createHash('sha256').update(str).digest('hex')
}

const _newSignature = function(client_key, timestamp, method, url, client_secret) {
    method = method.toLowerCase()

    let url_path

    try {
        url_path = new URL(url).pathname
    } catch (err) {
        url_path = url
    }

    let str = ''

    str += client_key
    str += timestamp
    str += method
    str += url_path

    return crypto.createHmac('sha256', client_secret).update(str).digest('hex')
}

module.exports = {
    _getHeader,
    _getUrl,
    _newFingerprint,
    _newSignature
}
