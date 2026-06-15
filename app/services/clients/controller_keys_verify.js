const app             = require(__app).app
const flow            = require('async')
const lib             = {
    auth : require(__sevdir + '/auth/lib')
}
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// CONTROLLER

const keysVerify = function(req, res, next) {

    // aggregate body, query & data keys
    const request = util.flow.agg(req)

    let results = {
        data               : request,
        fn                 : typeof res === 'function' ? res : null,
        client             : null,
        client_fingerprint : null,
        client_headers     : req.headers || {},
        client_ip          : req.ip,
        client_key         : lib.auth._getHeader(req.headers, 'x-client-key'),
        client_referer     : lib.auth._getHeader(req.headers, 'referer'),
        client_ua          : lib.auth._getHeader(req.headers, 'user-agent')
    }

    const validations = {
        data    : {
            client_key     : ['is_required'],
            client_referer : ['is_required'],
            client_ua      : ['is_required']

        },
        payload : {
            client : {
                client_fingerprint : ['is_allowed', 'is_required'],
                client_key         : ['is_allowed', 'is_required']
            }
        }
    }

    flow.waterfall([
        function(cb) {

            // VALIDATE

            // overwrite
            results.data = {
                client_key     : results.client_key,
                client_referer : results.client_referer,
                client_ua      : results.client_ua
            }

            validate(validations.data, results.data, util.origin(), cb)

        },
        function(cb) {

            const query = {
                client_key : results.client_key
            }

            app.emit('service:clients:get', {
                query : query,
                limit : 1
            }, function(err, data) {

                if (err) return cb(util.flow.err({
                    err     : err,
                    headers : results.client_headers
                }))

                // check if client was found
                if (!data.client) return cb(util.flow.err({
                    data    : {
                        headers : results.client_headers
                    },
                    message : 'Client access denied, invalid client, unkwon client key.',
                    status  : 401
                }))

                // check if referer are matching
                if (!results.client_referer.includes(data.client.client_host)) return cb(util.flow.err({
                    data    : {
                        headers : results.client_headers
                    },
                    message : 'Client access denied, invalid client, referer mismatch detected.',
                    status  : 401
                }))
                
                results.client = data.client

                cb()

            })

        },
        function(cb) {

            try {

                // create a client fingerprint to bind the JWT 
                // to this specific client
                results.client_fingerprint = lib.auth._newFingerprint(results.client_key, results.client_ua)
                
                cb()

            } catch (err) {

                cb(util.flow.err({
                    data    : {
                        err : err
                    },
                    message : 'Client access denied, invalid client, could not create client fingerprint.',
                }))

            }

        },
        function(cb) {

            // VALIDATE RESPONSE

            const payload = {
                client : {
                    client_fingerprint : results.client_fingerprint,
                    client_key         : results.client_key
                }
            }

            validatePayload(validations.payload, payload, util.origin(), cb)

        }
    ], function(err, data) {

        if (err) return res.status(err.status || 400).json(err)

        // merge client information
        data = {
            ...results.client,
            ...data.client
        }

        // save client information
        if (req.globals && req.globals.data) {
            req.globals.data.client = data
        }

        next() // !!!

    })
}

// EXPORTS

app.on('service:clients:controller:keys:verify', function(data, fn) {
    keysVerify({ ...data }, fn)
})

module.exports = keysVerify
