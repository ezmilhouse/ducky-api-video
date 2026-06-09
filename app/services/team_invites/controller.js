const app             = require(__app).app
const crypto          = require('crypto')
const flow            = require('async')
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// HELPERS

const getClientId = function(req) {

    if (!req.globals || !req.globals.data || !req.globals.data.client) return null

    return req.globals.data.client._id || null

}

const getUserId = function(req) {

    if (!req.globals || !req.globals.data || !req.globals.data.user) return null

    return req.globals.data.user._id || null

}

const getInviteEmails = function(body) {

    const emails = []
    const seen   = {}

    Object.keys(body || {}).forEach(function(key) {

        if (key.indexOf('team_invite_email_') !== 0) return

        const email = typeof body[key] === 'string' ? body[key].trim().toLowerCase() : ''

        if (!email || seen[email]) return

        seen[email] = true
        emails.push(email)

    })

    return emails

}

// CONTROLLERS

const create = function(req, res) {

    const results = {
        client_id    : getClientId(req),
        data         : {},
        emails       : getInviteEmails(req.body),
        fn           : typeof res === 'function' ? res : null,
        team         : null,
        team_id      : req.body && req.body.team_id ? req.body.team_id : null,
        team_invites : [],
        user_id      : getUserId(req)
    }

    const validations = {
        data : {
            client_id : ['is_required'],
            emails    : ['is_required'],
            team_id   : ['is_required'],
            user_id   : ['is_required']
        },
        payload : {
            team_invites : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            if (results.team_id) return cb()

            app.emit('service:teams:get', {
                query : {
                    client_id       : results.client_id,
                    user_id_created : results.user_id,
                    state           : {
                        $ne : 'gone'
                    }
                },
                sort  : {
                    ts : -1
                },
                limit : 1
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.team    = data.team || null
                results.team_id = results.team ? results.team._id : null
                cb()
            })
        },
        function(cb) {
            results.data = {
                client_id : results.client_id,
                emails    : results.emails.length ? results.emails.join(',') : null,
                team_id   : results.team_id,
                user_id   : results.user_id
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            let email_data = {}
            let email_rules = {}

            results.emails.forEach(function(email, index) {
                email_data['email_' + index] = email
                email_rules['email_' + index] = ['is_email']
            })

            validate(email_rules, email_data, util.origin(), cb)
        },
        function(cb) {
            flow.eachSeries(results.emails, function(email, done) {
                app.emit('service:team_invites:new', {
                    model : {
                        client_id         : results.client_id,
                        team_id           : results.team_id,
                        team_invite_email : email,
                        team_invite_token : crypto.randomBytes(24).toString('hex'),
                        user_id_created   : results.user_id
                    }
                }, function(err, data) {
                    if (err) return done(util.flow.err({ err : err }))
                    if (data.team_invite) results.team_invites.push(data.team_invite)
                    done()
                })
            }, cb)
        },
        function(cb) {
            validatePayload(validations.payload, {
                team_invites : results.team_invites
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

// EXPORTS

module.exports = {
    create
}
