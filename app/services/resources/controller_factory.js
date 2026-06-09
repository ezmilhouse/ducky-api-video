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

const normalizeEntry = function(entry, config, req) {

    entry = entry || {}

    const key_field = config.key
    const key_value = entry[key_field] || entry._id || entry[config.cli_key] || null

    const model = {
        ...entry,
        client_id             : getClientId(req),
        project_key           : req.params.project_key || entry.project_key || null,
        [key_field]           : key_value,
        [config.cli_key || ''] : undefined
    }

    delete model._id
    delete model.__v
    delete model[config.cli_key || '']

    if (typeof model.project_id !== 'undefined' && !/^[a-f0-9]{24}$/i.test(String(model.project_id))) {
        model.project_cli_id = model.project_id
        delete model.project_id
    }

    return model

}

const makeController = function(config) {

    const createQuery = function(req, key_value) {

        return {
            client_id   : getClientId(req),
            project_key : req.params.project_key,
            [config.key]: key_value
        }

    }

    const get = function(req, res) {

        const results = {
            client_id : getClientId(req),
            data      : {},
            fn        : typeof res === 'function' ? res : null,
            item      : null,
            key_value : req.params[config.key] || null
        }

        const validations = {
            data : {
                client_id   : ['is_required'],
                project_key : ['is_required'],
                resource_key: ['is_required']
            },
            payload : {
                [config.singular] : ['is_allowed', 'is_required']
            }
        }

        flow.waterfall([
            function(cb) {
                results.data = {
                    client_id    : results.client_id,
                    project_key  : req.params.project_key,
                    resource_key : results.key_value
                }
                validate(validations.data, results.data, util.origin(), cb)
            },
            function(cb) {
                app.emit('service:' + config.plural + ':get', {
                    query : createQuery(req, results.key_value),
                    limit : 1
                }, function(err, data) {
                    if (err) return cb(util.flow.err({ err : err }))
                    if (!data[config.singular]) return cb(util.flow.err({
                        message : config.singular + ' not found.',
                        status  : 404
                    }))
                    results.item = data[config.singular]
                    cb()
                })
            },
            function(cb) {
                validatePayload(validations.payload, {
                    [config.singular] : results.item
                }, util.origin(), cb)
            }
        ], function(err) {
            if (err) return res.status(err.status || 400).json(err)
            res.status(200).json({
                [config.singular] : results.item
            })
        })

    }

    const list = function(req, res) {

        const results = {
            client_id : getClientId(req),
            data      : {},
            fn        : typeof res === 'function' ? res : null,
            items     : null
        }

        const validations = {
            data : {
                client_id   : ['is_required'],
                project_key : ['is_required']
            },
            payload : {
                [config.plural] : ['is_allowed', 'is_required']
            }
        }

        flow.waterfall([
            function(cb) {
                results.data = {
                    client_id   : results.client_id,
                    project_key : req.params.project_key
                }
                validate(validations.data, results.data, util.origin(), cb)
            },
            function(cb) {
                app.emit('service:' + config.plural + ':get', {
                    query : {
                        client_id   : results.client_id,
                        project_key : req.params.project_key,
                        state       : {
                            $ne : 'gone'
                        }
                    },
                    limit : 1000
                }, function(err, data) {
                    if (err) return cb(util.flow.err({ err : err }))
                    results.items = data[config.plural] || []
                    cb()
                })
            },
            function(cb) {
                validatePayload(validations.payload, {
                    [config.plural] : results.items
                }, util.origin(), cb)
            }
        ], function(err) {
            if (err) return res.status(err.status || 400).json(err)
            res.status(200).json({
                [config.plural] : results.items
            })
        })

    }

    const update = function(req, res) {

        const results = {
            client_id : getClientId(req),
            data      : {},
            fn        : typeof res === 'function' ? res : null,
            item      : null,
            key_value : req.params[config.key] || null,
            model     : null
        }

        const validations = {
            data : {
                client_id    : ['is_required'],
                project_key  : ['is_required'],
                resource_key : ['is_required']
            },
            payload : {
                [config.singular] : ['is_allowed', 'is_required']
            }
        }

        flow.waterfall([
            function(cb) {
                results.model = normalizeEntry({
                    ...req.body,
                    [config.key] : results.key_value
                }, config, req)
                results.data = {
                    client_id    : results.client_id,
                    project_key  : req.params.project_key,
                    resource_key : results.key_value
                }
                validate(validations.data, results.data, util.origin(), cb)
            },
            function(cb) {
                app.emit('service:' + config.plural + ':set', {
                    query : createQuery(req, results.key_value),
                    model : results.model,
                    limit : 1
                }, function(err, data) {
                    if (err) return cb(util.flow.err({ err : err }))
                    results.item = data[config.singular]
                    cb()
                })
            },
            function(cb) {
                validatePayload(validations.payload, {
                    [config.singular] : results.item
                }, util.origin(), cb)
            }
        ], function(err) {
            if (err) return res.status(err.status || 400).json(err)
            res.status(200).json({
                [config.singular] : results.item
            })
        })

    }

    const upsertMany = function(req, res) {

        const results = {
            client_id : getClientId(req),
            data      : {},
            fn        : typeof res === 'function' ? res : null,
            items     : [],
            models    : []
        }

        const validations = {
            data : {
                client_id   : ['is_required'],
                project_key : ['is_required'],
                resources   : ['is_required']
            },
            payload : {
                [config.plural] : ['is_allowed', 'is_required']
            }
        }

        flow.waterfall([
            function(cb) {
                const entries = req.body[config.plural] || []
                results.models = entries.map(function(entry) {
                    return normalizeEntry(entry, config, req)
                }).filter(function(entry) {
                    return !!entry[config.key]
                })
                results.data = {
                    client_id   : results.client_id,
                    project_key : req.params.project_key,
                    resources   : results.models
                }
                validate(validations.data, results.data, util.origin(), cb)
            },
            function(cb) {
                flow.eachOfSeries(results.models, function(model, index, next) {
                    app.emit('service:' + config.plural + ':new:if', {
                        query : {
                            client_id     : results.client_id,
                            project_key   : req.params.project_key,
                            [config.key]  : model[config.key]
                        },
                        model : model
                    }, function(err, data) {
                        if (err) return next(err)
                        if (data[config.singular]) results.items.push(data[config.singular])
                        next()
                    })
                }, cb)
            },
            function(cb) {
                validatePayload(validations.payload, {
                    [config.plural] : results.items
                }, util.origin(), cb)
            }
        ], function(err) {
            if (err) return res.status(err.status || 400).json(err)
            res.status(200).json({
                [config.plural] : results.items
            })
        })

    }

    return {
        get,
        list,
        update,
        upsertMany
    }

}

// EXPORTS

module.exports = makeController
