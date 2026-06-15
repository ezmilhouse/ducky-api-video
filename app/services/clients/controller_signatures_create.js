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

const signaturesCreate = function(req, res, next) {

    // aggregate body, query & data keys
    const request = util.flow.agg(req)

    const results = {
        data             : request,
        fn               : typeof res === 'function' ? res : null,
        client           : !req.globals || !req.globals.data || !req.globals.data.client ? null : req.globals.data.client || null,
        client_timestamp : moment.utc().valueOf(),
        request_method   : request.request_method || null,
        request_url      : request.request_url || null
    }

    const validations = {
        data    : {
            client           : ['is_required'],
            client_timestamp : ['is_required'],
            request_method   : ['is_required'],
            request_url      : ['is_required'],
        },
        payload : {
            client : {
                client_key       : ['is_allowed', 'is_required'],
                client_signature : ['is_allowed', 'is_required'],
                client_token     : ['is_allowed', 'is_optional'],
                ts               : ['is_allowed', 'is_required']
            }
        }
    }

    flow.waterfall([
        function(cb) {
        
            // VALIDATE

            // overwrite
            results.data = {
                client           : results.client,
                client_timestamp : results.client_timestamp,
                request_method   : results.request_method,
                request_url      : results.request_url
            }

            validate(validations.data, results.data, util.origin(), cb)

        },
        function(cb) {

            // skip
            // if no requirement to set cookie
            if (!results.client.client_permissions.includes('sign_cookie')) return cb()

            // COOKIE & TOKEN

            try {

                let sign_cookie
                let sign_payload
                let sign_secret
                let sign_token

                // ---

                sign_payload = {
                    client_key         : results.client.client_key,
                    client_fingerprint : results.client.client_fingerprint,
                    // timestamp make token unique
                    ts                 : results.client_timestamp
                }

                sign_secret = env.session_sign.secret

                // create a JWT with the validated client info
                sign_token = jwt.sign(sign_payload, sign_secret, { 
                    // the token should expire within a very short
                    // time to avoid risk of reusability; make the
                    // token survive a little bit longer than the 
                    // cookie so that we never have an expired token
                    // in the cookie
                    expiresIn : ((env.session_sign.cookie.maxAge + (1000 * 5)) / 1000) + 's'
                })

                // save JWT in cookie
                sign_cookie = env.session_sign.cookie

                // set cookie
                res.cookie(env.session_sign.name, sign_token, sign_cookie)

                results.client_token = sign_token

                cb()

            } catch(err) {

                return cb(util.flow.err({
                    data    : results.data,
                    err     : err,
                    message : 'Could not sign request. Encrypting JWT token failed.',
                    status  : 500
                }))
                
            }

        },
        function(cb) {
            
            // SIGNATURE

            results.client_signature = lib.auth._newSignature(results.client.client_key, results.client_timestamp, req.body.request_method, req.body.request_url, results.client.client_secret)

            cb()

        },
        function(cb) {

            // VALIDATE RESPONSE

            const payload = {
                client : {
                    client_key       : results.client.client_key,
                    client_signature : results.client_signature,
                    client_token     : results.client_token || null,
                    ts               : results.client_timestamp
                }
            }

            validatePayload(validations.payload, payload, util.origin(), cb)

        }
    ], util.flow.end(results, res))

}

// EXPORTS

app.on('service:clients:controller:signatures:create', function(data, fn) {
    signaturesCreate({ ...data }, fn)
})

module.exports = signaturesCreate
