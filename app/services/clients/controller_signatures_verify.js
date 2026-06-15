const app             = require(__app).app
const env             = require(__app).env
const flow            = require('async')
const jwt             = require('jsonwebtoken')
const moment          = require('moment')
const lib             = {
    auth : require(__sevdir + '/auth/lib')
}
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// CONTROLLER

const signaturesVerify = function(req, res, next) {

    // aggregate body, query & data keys
    const request = util.flow.agg(req)

    const results = {
        data                   : request,
        fn                     : typeof res === 'function' ? res : null,
        client                 : !req.globals || !req.globals.data || !req.globals.data.client ? null : req.globals.data.client,
        client_fingerprint     : !req.globals || !req.globals.data || !req.globals.data.client ? null : req.globals.data.client.client_fingerprint || null,
        client_fingerprint_cur : null,
        client_headers         : req.headers || {},
        client_ip              : req.ip,
        client_key             : !req.globals || !req.globals.data || !req.globals.data.client ? null : req.globals.data.client.client_key || null,
        client_secret          : !req.globals || !req.globals.data || !req.globals.data.client ? null : req.globals.data.client.client_secret || null,
        client_signature       : lib.auth._getHeader(req.headers, 'x-client-signature'),
        client_signature_cur   : null,
        client_timestamp       : lib.auth._getHeader(req.headers, 'x-timestamp'),
        client_token           : lib.auth._getHeader(req.headers, 'x-client-token') || lib.auth._getHeader(req.headers, 'x-mx-reqtoken') || req.cookies[env.session_sign.name] || null,
        client_token_decoded   : null,
        client_ua              : lib.auth._getHeader(req.headers, 'user-agent')
    }

    const validations = {
        data    : {
            client             : ['is_required'],
            client_fingerprint : ['is_required'],
            client_signature   : ['is_required'],
            client_secret      : ['is_required'],
            client_timestamp   : ['is_required'],
            client_token       : ['is_optional'],
            client_ua          : ['is_required']

        },
        payload : {
            client : {
                client_key       : ['is_allowed', 'is_required'],
                client_signature : ['is_allowed', 'is_required'],
                ts               : ['is_allowed', 'is_required']
            }
        }
    }

    flow.waterfall([
        function(cb) {
        
            // VALIDATE

            // overwrite
            results.data = {
                client             : results.client,
                client_fingerprint : results.client_fingerprint,
                client_secret      : results.client_secret,
                client_signature   : results.client_signature,
                client_timestamp   : results.client_timestamp,
                client_token       : results.client_token,
                client_ua          : results.client_ua
            }

            validate(validations.data, results.data, util.origin(), cb)

        },
        function(cb) {

            // skip
            // if no requirement for cookie or internal user agent
            if (!results.client.client_permissions || !results.client.client_permissions.length || !results.client.client_permissions.includes('sign_cookie') || results.client_ua === 'app') return cb()

            // VERIFY JWT TOKEN
            
            try {

                // extract jwt token
                results.client_token_decoded = jwt.verify(results.client_token, env.session_sign.secret)
            
                // VERIFY: TIMESTAMP FRESHNESS

                // check if timestamp is within acceptable range
                const ts_margin  = env.session_sign.cookie.maxAge
                const ts_now     = moment.utc().valueOf()
                const ts_request = parseInt(results.client_token_decoded.ts, 10)
                const ts_diff    = ts_now - ts_request

                // skip
                // if too much time
                if (ts_diff > ts_margin || ts_diff < (-1 * ts_margin)) {
                    return cb(util.flow.err({
                        data    : {
                            headers      : results.client_headers,
                            time_margin  : ts_margin,
                            time_now     : ts_now,
                            time_request : ts_request,
                            time_diff    : ts_diff
                        },
                        message : 'Invalid signature, expired or clock skew too great.',
                        status  : 401
                    }))
                }
                
                cb()
                
            } catch (err) {

                // handle different JWT verification errors
                let message = 'Access denied, invalid signature.'
                let status = 401
                
                if (err.name === 'TokenExpiredError') {
                    message = 'Access denied, invalid signature, token expired.'
                } else if (err.name === 'JsonWebTokenError') {
                    message = 'Access denied, invalid signature, corrupt token.'
                }
                
                return cb(util.flow.err({
                    data    : {},
                    err     : err,
                    message : message,
                    status  : status
                }))
                
            }
            
        },
        function(cb) {

            // VERIFY: FINGERPRINT

            // recreate the expected fingerprint
            results.client_fingerprint_cur = lib.auth._newFingerprint(results.client_key, results.client_ua)

            // skip
            // if mismatching fingerprints
            if (results.client_fingerprint_cur !== results.client_fingerprint) {
                return cb(util.flow.err({
                    data    : {
                        headers : results.client_headers
                    },
                    message : 'Invalid signature, fingerprint mismatch detected.',
                    status  : 401
                }))
            }

            cb()

        },
        function(cb) {

            // VERIFY: SIGNATURE

            // recreate the expected signature
            results.client_signature_cur = lib.auth._newSignature(results.client_key, results.client_timestamp, req.method, lib.auth._getUrl(req), results.client_secret)
            
            // skip
            // if mismatching signatures
            if (results.client_signature !== results.client_signature_cur) {
                return cb(util.flow.err({
                    data    : {
                        headers : results.client_headers
                    },
                    message : 'Invalid signature, signature mismatch detected.',
                    status  : 401
                }))
            }

            cb()

        },
        function(cb) {

            // VALIDATE RESPONSE

            const payload = {
                client : {
                    client_key       : results.client.client_key,
                    client_signature : results.client_signature,
                    ts               : results.client_timestamp
                }
            }

            validatePayload(validations.payload, payload, util.origin(), cb)

        }
    ], function(err, data) {
        if (err) return res.status(err.status || 400).json(err)
        next() // !!!
    })

}

// EXPORTS

app.on('service:clients:controller:signatures:verify', function(data, fn) {
    signaturesVerify({ ...data }, fn)
})

module.exports = signaturesVerify
