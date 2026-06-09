const app             = require(__app).app
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

const normalizeTeam = function(data) {

    data = data || {}

    const team_name_display = data.team_name_display || data.team_name || null
    const team_name         = data.team_name || util.toSlug(team_name_display || '')

    return {
        team_name         : team_name,
        team_name_display : team_name_display,
        state             : data.state || 'ok'
    }

}

// CONTROLLERS

const create = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        model     : null,
        team      : null,
        user_id   : getUserId(req)
    }

    const validations = {
        data : {
            client_id         : ['is_required'],
            team_name         : ['is_required'],
            team_name_display : ['is_required'],
            user_id           : ['is_required']
        },
        payload : {
            team : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.model = {
                client_id       : results.client_id,
                user_id_created : results.user_id,
                ...normalizeTeam(req.body)
            }
            results.data = {
                client_id         : results.model.client_id,
                team_name         : results.model.team_name,
                team_name_display : results.model.team_name_display,
                user_id           : results.model.user_id_created
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:teams:new', {
                model : results.model
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.team = data.team
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                team : results.team
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

const current = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        team      : null,
        user_id   : getUserId(req)
    }

    const validations = {
        data : {
            client_id : ['is_required'],
            user_id   : ['is_required']
        },
        payload : {
            team : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id : results.client_id,
                user_id   : results.user_id
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
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
                if (!data.team) return cb(util.flow.err({
                    message : 'Team not found.',
                    status  : 404
                }))
                results.team = data.team
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                team : results.team
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

// EXPORTS

module.exports = {
    create,
    current
}
