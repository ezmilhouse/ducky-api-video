const app             = require(__app).app
const flow            = require('async')
const schemas         = require(__app).schemas
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// HELPERS

const getClientId = function(req) {

    if (!req.globals || !req.globals.data || !req.globals.data.client) return null

    return req.globals.data.client._id || null

}

const createJob = function(model) {

    return new Promise(function(resolve, reject) {
        app.emit('service:jobs:new', {
            model : model
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.job)
        })
    })

}

const updateFlowRun = function(clientId, flowRunKey, model) {

    return new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:set', {
            query : {
                client_id    : clientId,
                flow_run_key : flowRunKey,
                state        : {
                    $ne : 'gone'
                }
            },
            model : model,
            limit : 1
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.flow_run)
        })
    })

}

const isManualStep = function(step) {

    return step && step.job_type && step.job_type.indexOf('manual.') === 0

}

const isUnsupportedStep = function(step) {

    return step && (step.step_kind === 'unsupported' || step.worker_supported === false && !isManualStep(step))

}

const parsePositiveInt = function(value, fallback, max) {

    const parsed = parseInt(value, 10)

    if (Number.isNaN(parsed) || parsed < 0) return fallback
    if (max && parsed > max) return max

    return parsed

}

const queryValue = function(req, key) {

    if (typeof req.query[key] !== 'undefined') return req.query[key]
    if (typeof req.body[key] !== 'undefined') return req.body[key]

    return null

}

const getFlowRun = function(clientId, projectKey, flowRunKey) {

    return new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:get', {
            query : {
                client_id    : clientId,
                flow_run_key : flowRunKey,
                project_key  : projectKey || {
                    $ne : null
                },
                state        : {
                    $ne : 'gone'
                }
            },
            limit : 1
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.flow_run || null)
        })
    })

}

const advanceFlowRun = async function(clientId, job) {

    if (!job || !job.flow_run_key || !job.flow_step_index) return
    if (job.state !== 'ok' && job.state !== 'error') return

    const flowRun = await new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:get', {
            query : {
                client_id    : clientId,
                flow_run_key : job.flow_run_key,
                project_key  : job.project_key,
                state        : {
                    $ne : 'gone'
                }
            },
            limit : 1
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.flow_run || null)
        })
    })

    if (!flowRun) return

    const steps = (flowRun.flow_steps || []).map(function(step) {
        if (step.flow_step_index === job.flow_step_index) {
            return Object.assign({}, step, {
                job_id : job._id,
                state  : job.state
            })
        }
        return step
    })

    if (job.state === 'error') {
        await updateFlowRun(clientId, job.flow_run_key, {
            current_step_index : job.flow_step_index,
            flow_steps         : steps,
            state              : 'error'
        })
        return
    }

    const nextStep = steps.find(function(step) {
        return step.flow_step_index === job.flow_step_index + 1
    })

    if (!nextStep) {
        await updateFlowRun(clientId, job.flow_run_key, {
            current_step_index : job.flow_step_index,
            flow_steps         : steps,
            state              : 'ok'
        })
        return
    }

    const updatedSteps = steps.map(function(step) {
        if (step.flow_step_index === nextStep.flow_step_index) {
            return Object.assign({}, step, {
                state : isManualStep(nextStep) ? 'paused' : isUnsupportedStep(nextStep) ? 'unsupported' : 'pending'
            })
        }
        return step
    })

    if (isManualStep(nextStep) || isUnsupportedStep(nextStep)) {
        await updateFlowRun(clientId, job.flow_run_key, {
            current_step_index : nextStep.flow_step_index,
            flow_steps         : updatedSteps,
            state              : 'paused'
        })
        return
    }

    const nextJob = await createJob({
        client_id      : clientId,
        content_profile: nextStep.content_profile,
        flow_key       : flowRun.flow_key,
        flow_run_key   : flowRun.flow_run_key,
        flow_step_index: nextStep.flow_step_index,
        flow_step_key  : nextStep.flow_step_key,
        job_args       : nextStep.job_payload || {},
        job_command    : nextStep.job_command,
        job_payload    : nextStep.job_payload || {},
        job_source     : 'api',
        job_type       : nextStep.job_type,
        project_key    : job.project_key,
        prompt_profile : nextStep.prompt_profile,
        state          : 'pending'
    })

    await updateFlowRun(clientId, job.flow_run_key, {
        current_step_index : nextStep.flow_step_index,
        flow_steps         : updatedSteps.map(function(step) {
            if (step.flow_step_index === nextStep.flow_step_index) {
                return Object.assign({}, step, {
                    job_id : nextJob._id
                })
            }
            return step
        }),
        state              : 'running'
    })

}

// CONTROLLERS

const create = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        job       : null,
        model     : null
    }

    const validations = {
        data : {
            client_id   : ['is_required'],
            job_command : ['is_required']
        },
        payload : {
            job : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.model = {
                content_profile : req.body.content_profile || null,
                client_id      : results.client_id,
                flow_key       : req.body.flow_key || null,
                flow_run_key   : req.body.flow_run_key || null,
                flow_step_index: req.body.flow_step_index || null,
                flow_step_key  : req.body.flow_step_key || null,
                job_args       : req.body.job_args || {},
                job_claimed_by : req.body.job_claimed_by || null,
                job_command    : req.body.job_command || null,
                job_exit_code  : req.body.job_exit_code || null,
                job_finished   : req.body.job_finished || null,
                job_log_stderr : req.body.job_log_stderr || null,
                job_log_stdout : req.body.job_log_stdout || null,
                job_metrics    : req.body.job_metrics || {},
                job_payload    : req.body.job_payload || {},
                job_progress_current : req.body.job_progress_current || null,
                job_progress_label   : req.body.job_progress_label || null,
                job_progress_step    : req.body.job_progress_step || null,
                job_progress_total   : req.body.job_progress_total || null,
                job_source     : req.body.job_source || 'cli',
                job_started    : req.body.job_started || null,
                job_type       : req.body.job_type || null,
                job_worker_id  : req.body.job_worker_id || null,
                prompt_profile : req.body.prompt_profile || null,
                project_id     : req.body.project_id || null,
                project_key    : req.body.project_key || null,
                state          : req.body.state || 'pending'
            }
            results.data = {
                client_id   : results.model.client_id,
                job_command : results.model.job_command
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:jobs:new', {
                model : results.model
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.job = data.job
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                job : results.job
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

const claim = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        filters   : {},
        fn        : typeof res === 'function' ? res : null,
        job       : null,
        worker_id : req.body.job_worker_id || req.body.worker_id || null
    }

    const validations = {
        data : {
            client_id : ['is_required'],
            worker_id : ['is_required']
        },
        payload : {
            job : ['is_allowed']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id : results.client_id,
                worker_id : results.worker_id
            }
            results.filters = {
                client_id  : results.client_id,
                job_source : 'api',
                state      : 'pending'
            }

            if (req.body.project_key) results.filters.project_key = req.body.project_key
            if (req.body.flow_run_key) results.filters.flow_run_key = req.body.flow_run_key
            if (req.body.job_type) results.filters.job_type = req.body.job_type

            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            if (!req.body.flow_run_key) return cb()

            getFlowRun(results.client_id, req.body.project_key || null, req.body.flow_run_key)
                .then(function(flowRun) {
                    if (!flowRun || flowRun.state !== 'running') {
                        results.filters._id = null
                    }
                    cb()
                })
                .catch(function(err) {
                    cb(util.flow.err({ err : err }))
                })
        },
        function(cb) {
            schemas.Job.Model.findOneAndUpdate(
                results.filters,
                {
                    job_claimed_by : results.worker_id,
                    job_started    : new Date(),
                    job_worker_id  : results.worker_id,
                    state          : 'running'
                },
                {
                    new                 : true,
                    runValidators       : true,
                    setDefaultsOnInsert : false,
                    sort                : {
                        flow_run_key   : 1,
                        flow_step_index: 1,
                        ts             : 1
                    },
                    upsert              : false,
                    useFindAndModify    : false
                },
                function(err, job) {
                if (err) return cb(util.flow.err({ err : err }))
                results.job = job || null
                cb()
                }
            ).lean()
        },
        function(cb) {
            validatePayload(validations.payload, {
                job : results.job
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

const list = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        filters   : {},
        fn        : typeof res === 'function' ? res : null,
        jobs      : null,
        meta      : {}
    }

    const validations = {
        data : {
            client_id : ['is_required']
        },
        payload : {
            jobs : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id : results.client_id
            }
            results.filters = {
                client_id : results.client_id,
                state     : {
                    $ne : 'gone'
                }
            }

            ;[
                'flow_key',
                'flow_run_key',
                'job_source',
                'job_type',
                'project_key',
                'state'
            ].forEach(function(key) {
                const value = queryValue(req, key)
                if (value) results.filters[key] = value
            })

            results.meta = {
                filters : {
                    flow_key     : results.filters.flow_key || null,
                    flow_run_key : results.filters.flow_run_key || null,
                    job_source   : results.filters.job_source || null,
                    job_type     : results.filters.job_type || null,
                    project_key  : results.filters.project_key || null,
                    state        : results.filters.state && results.filters.state.$ne ? null : results.filters.state || null
                },
                limit : parsePositiveInt(queryValue(req, 'limit'), 100, 500),
                skip  : parsePositiveInt(queryValue(req, 'skip'), 0, 100000)
            }

            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            app.emit('service:jobs:get', {
                query : results.filters,
                sort  : {
                    ts : -1
                },
                limit : results.meta.limit,
                skip  : results.meta.skip
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.jobs = data.jobs || []
                results.meta.count = results.jobs.length
                cb()
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                jobs : results.jobs
            }, util.origin(), cb)
        }
    ], function(err) {
        if (err) return res.status(err.status || 400).json(err)
        res.status(200).json({
            jobs : results.jobs,
            meta : results.meta
        })
    })

}

const update = function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        fn        : typeof res === 'function' ? res : null,
        job       : null,
        job_id    : req.params.job_id || null,
        model     : {}
    }

    const validations = {
        data : {
            client_id : ['is_required'],
            job_id    : ['is_required']
        },
        payload : {
            job : ['is_allowed', 'is_required']
        }
    }

    flow.waterfall([
        function(cb) {
            results.data = {
                client_id : results.client_id,
                job_id    : results.job_id
            }
            validate(validations.data, results.data, util.origin(), cb)
        },
        function(cb) {
            results.model = {
                job_exit_code  : req.body.job_exit_code,
                job_finished   : req.body.job_finished,
                job_log_stderr : req.body.job_log_stderr,
                job_log_stdout : req.body.job_log_stdout,
                job_metrics    : req.body.job_metrics,
                job_progress_current : req.body.job_progress_current,
                job_progress_label   : req.body.job_progress_label,
                job_progress_step    : req.body.job_progress_step,
                job_progress_total   : req.body.job_progress_total,
                job_started    : req.body.job_started,
                state          : req.body.state
            }

            Object.keys(results.model).forEach(function(key) {
                if (typeof results.model[key] === 'undefined') delete results.model[key]
            })

            app.emit('service:jobs:set', {
                query : {
                    _id       : results.job_id,
                    client_id : results.client_id
                },
                model : results.model,
                limit : 1
            }, function(err, data) {
                if (err) return cb(util.flow.err({ err : err }))
                results.job = data.job
                advanceFlowRun(results.client_id, results.job)
                    .then(function() {
                        cb()
                    })
                    .catch(function(err) {
                        cb(util.flow.err({ err : err }))
                    })
            })
        },
        function(cb) {
            validatePayload(validations.payload, {
                job : results.job
            }, util.origin(), cb)
        }
    ], util.flow.end(results, res))

}

// EXPORTS

module.exports = {
    claim,
    create,
    list,
    update
}
