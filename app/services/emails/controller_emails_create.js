const app             = require(__app).app
const env             = require(__app).env
const flow            = require('async')
const lib             = require('./lib')
const moment          = require('moment')
const postmark        = require('postmark')
const schemas         = require(__app).schemas
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// CONTROLLER

const emailsCreate = function(req, res, next) {

    // aggregate body, query & data keys
    const request = util.flow.agg(req)

    const results = {
        email     : null,
        email_env : env.services.vendors.postmark.servers[env.name || null],
        data      : request,
        fn        : typeof res === 'function' ? res : null
    }

    const validations = {
        data    : {
            email_env  : ['is_required'],
            email_meta : ['is_optional'],
            email_type : ['is_required'],
            email_address_recipient : ['is_required'] // recipient
        },
        model   : {
            email_address_sender    : ['is_required'],
            email_address_recipient : ['is_required'],
            email_env               : ['is_required'],
            email_meta              : ['is_optional'],
            email_tld               : ['is_required'],
            email_type              : ['is_required']
        },
        payload : {
            email : {
                email_id_postmark : ['is_allowed', 'is_required'],
                state             : ['is_allowed', 'is_required'],
                ts                : ['is_allowed', 'is_required']
            }
        }
    }

    flow.waterfall([
        function(cb) {
    
            // add server token
            results.data.email_env = results.email_env

            // VALIDATE

            validate(validations.data, results.data, util.origin(), cb)

        },
        function(cb) {

            // MODEL

            const model = {
                email_address_recipient : results.data.email_address_recipient,
                email_address_sender    : results.email_env.email,
                email_env               : results.email_env,
                email_meta              : results.data.email_meta,
                email_tld               : results.email_env.email_tld,
                email_type              : results.data.email_type
            }

            // VALIDATE

            const model_test = validate(validations.model, model, util.origin())

            // skip 
            // if model test fails
            if (!model_test.validate) return cb(model_test)            

            // NEW (SEND)

            lib.send(model, function(err, data) {
                if (err) {
                    results.email = {
                        email_sent : {
                            email_id_postmark : 'skipped',
                            state             : 'skipped',
                            ts                : new Date()
                        }
                    }
                    return cb()
                }
                results.email = data.email
                cb()
            })

        },
        function(cb) {

            // VALIDATE RESPONSE

            const payload = {
                email      : {
                    email_id_postmark : results.email.email_sent.email_id_postmark,
                    state             : results.email.email_sent.state,
                    ts                : results.email.email_sent.ts,
                }
            }

            validatePayload(validations.payload, payload, util.origin(), cb)

        }
    ], util.flow.end(results, res))

}

// EXPORTS

app.on('service:emails:controller:create', function(data, fn) {
    emailsCreate({ ...data }, fn)
})

module.exports = emailsCreate
