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

const normalizeProjectMeta = function(data) {

    if (!data || typeof data.project_meta !== 'object' || Array.isArray(data.project_meta)) {
        return {}
    }

    return data.project_meta

}

const normalizeProject = function(data) {

    data = data || {}

    const project_name_display = data.project_name_display || data.project_name || data.project_key || null
    const project_name         = data.project_name || util.toSlug(project_name_display || data.project_key || '')
    const project_key          = data.project_key || project_name

    return {
        project_api_root     : data.project_api_root || null,
        project_key          : project_key,
        project_meta         : normalizeProjectMeta(data),
        project_mode         : data.project_mode || 'connected',
        project_name         : project_name,
        project_name_display : project_name_display,
        project_prefix       : data.project_prefix || null,
        project_root         : data.project_root || null,
        project_type         : data.project_type || 'game',
        state                : data.state || 'ok'
    }

}

// CONTROLLERS

const list = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        projects  : null
    }

    const validations = {
        data : {
            client_id : ['is_required']
        },
        payload : {
            projects : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id : results.client_id
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:projects:get', {
                query : {
                    client_id : results.client_id,
                    state     : {
                        $ne : 'gone'
                    }
                },
                limit : 100
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.projects = data.projects || []
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                projects : results.projects
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

const get = function(req, res) {

    const results = {
        client_id   : getClientId(req),
        data        : {},
        fn          : typeof res === 'function' ? res : null,
        project     : null,
        project_key : req.params.project_key || null
    }

    const validations = {
        data : {
            client_id   : ['is_required'],
            project_key : ['is_required']
        },
        payload : {
            project : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id   : results.client_id,
                project_key : results.project_key
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:projects:get', {
                query : {
                    client_id   : results.client_id,
                    project_key : results.project_key,
                    state       : {
                        $ne : 'gone'
                    }
                },
                limit : 1
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                if (!data.project) return cb(util.flow.err({
                    message : 'Project not found.',
                    status  : 404
                }))
                results.project = data.project
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                project : results.project
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

const upsert = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        model     : null,
        project   : null
    }

    const validations = {
        data : {
            client_id            : ['is_required'],
            project_key          : ['is_required'],
            project_meta         : ['is_optional'],
            project_name         : ['is_required'],
            project_name_display : ['is_required'],
            project_type         : ['is_required']
        },
        payload : {
            project : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.model = {
                client_id : results.client_id,
                ...normalizeProject({
                    ...req.body,
                    project_key : req.params.project_key || req.body.project_key
                })
            }
            results.data = {
                client_id            : results.model.client_id,
                project_key          : results.model.project_key,
                project_meta         : results.model.project_meta,
                project_name         : results.model.project_name,
                project_name_display : results.model.project_name_display,
                project_type         : results.model.project_type
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:projects:new:if', {
                query : {
                    client_id   : results.client_id,
                    project_key : results.model.project_key
                },
                model : results.model
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.project = data.project
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                project : results.project
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

// EXPORTS

module.exports = {
    get,
    list,
    upsert
}
