const app             = require(__app).app
const controllers     = require(__regdir + '/controllers')
const flowDefinitions = require(__sevdir + '/flows/definitions')
const router          = require('express').Router()
const uuid            = require('uuid')

// CONTROLLERS

const clients = controllers.clients

// HELPERS

const getClientId = function(req) {

    if (!req.globals || !req.globals.data || !req.globals.data.client) return null

    return req.globals.data.client._id || null

}

const respond = function(res, status, payload) {

    res.status(status).json(payload)

}

const publicFlow = function(flow) {

    return {
        content_profile: flow.content_profile,
        description    : flow.description,
        flow_key       : flow.flow_key,
        flow_name      : flow.flow_name,
        project_type   : flow.project_type,
        prompt_profile : flow.prompt_profile,
        steps          : flow.steps.map(function(step, index) {
            return {
                flow_step_index: index + 1,
                flow_step_key  : step.flow_step_key,
                instructions   : step.instructions || null,
                job_command    : step.job_command,
                job_type       : step.job_type,
                step_kind      : step.step_kind || 'worker',
                worker_supported: step.worker_supported === true,
                required_fields: step.required_fields || []
            }
        })
    }

}

const mergedPayload = function(req, step) {

    return Object.assign(
        {},
        req.body.job_payload || {},
        step.job_payload || {},
        {
            project_dir : req.body.project_dir || req.body.project_root || req.body.job_payload?.project_dir || req.body.job_payload?.project_root || null,
            project_root: req.body.project_root || req.body.project_dir || req.body.job_payload?.project_root || req.body.job_payload?.project_dir || null
        }
    )

}

const missingFields = function(payload, requiredFields) {

    return (requiredFields || []).filter(function(field) {
        return payload[field] === null || typeof payload[field] === 'undefined' || payload[field] === ''
    })

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

const createFlowRun = function(model) {

    return new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:new', {
            model : model
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.flow_run)
        })
    })

}

const getFlowRun = function(clientId, projectKey, flowRunKey) {

    return new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:get', {
            query : {
                client_id    : clientId,
                flow_run_key : flowRunKey,
                project_key  : projectKey,
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

const getFlowRunJobs = function(clientId, projectKey, flowRunKey) {

    return new Promise(function(resolve, reject) {
        app.emit('service:jobs:get', {
            query : {
                client_id    : clientId,
                flow_run_key : flowRunKey,
                project_key  : projectKey,
                state        : {
                    $ne : 'gone'
                }
            },
            limit : 100
        }, function(err, data) {
            if (err) return reject(err)
            resolve(data.jobs || [])
        })
    })

}

const setFlowRunJobs = function(clientId, projectKey, flowRunKey, queryState, model) {

    return new Promise(function(resolve, reject) {
        const query = {
            client_id    : clientId,
            flow_run_key : flowRunKey,
            project_key  : projectKey
        }

        if (queryState) query.state = queryState

        app.emit('service:jobs:set', {
            query : query,
            model : model,
            limit : 100
        }, function(err, data) {
            if (err && err.status !== 404) return reject(err)
            resolve(data && data.jobs ? data.jobs : [])
        })
    })

}

const buildStepPlan = function(req, flow) {

    return flow.steps.map(function(step, index) {
        const payload = mergedPayload(req, step)

        return {
            content_profile : req.body.content_profile || flow.content_profile,
            flow_step_index: index + 1,
            flow_step_key  : step.flow_step_key,
            instructions   : step.instructions || null,
            job_command    : step.job_command,
            job_payload    : payload,
            job_type       : step.job_type,
            prompt_profile : req.body.prompt_profile || flow.prompt_profile || 'default',
            step_kind      : step.step_kind || 'worker',
            state          : index === 0 ? 'pending' : 'blocked',
            worker_supported: step.worker_supported === true
        }
    })

}

const isManualStep = function(step) {

    return step && step.job_type && step.job_type.indexOf('manual.') === 0

}

const isUnsupportedStep = function(step) {

    return step && (step.step_kind === 'unsupported' || step.worker_supported === false && !isManualStep(step))

}

const createStepJob = function(clientId, projectKey, flowRun, step) {

    return createJob({
        client_id      : clientId,
        content_profile: step.content_profile,
        flow_key       : flowRun.flow_key,
        flow_run_key   : flowRun.flow_run_key,
        flow_step_index: step.flow_step_index,
        flow_step_key  : step.flow_step_key,
        job_args       : step.job_payload,
        job_command    : step.job_command,
        job_payload    : step.job_payload,
        job_source     : 'api',
        job_type       : step.job_type,
        project_key    : projectKey,
        prompt_profile : step.prompt_profile,
        state          : 'pending'
    })

}

const updateFlowRun = function(clientId, projectKey, flowRunKey, model) {

    return new Promise(function(resolve, reject) {
        app.emit('service:flow_runs:set', {
            query : {
                client_id    : clientId,
                flow_run_key : flowRunKey,
                project_key  : projectKey,
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

const createRunnableStep = async function(clientId, projectKey, flowRun, steps, stepIndex) {

    const targetStep = steps.find(function(step) {
        return step.flow_step_index === stepIndex
    })

    if (!targetStep) return {
        jobs  : [],
        state : 'ok',
        steps : steps
    }

    if (isManualStep(targetStep)) {
        return {
            jobs  : [],
            state : 'paused',
            steps : steps.map(function(step) {
                if (step.flow_step_index === targetStep.flow_step_index) {
                    return Object.assign({}, step, {
                        state : 'paused'
                    })
                }
                return step
            })
        }
    }

    if (isUnsupportedStep(targetStep)) {
        return {
            jobs  : [],
            state : 'paused',
            steps : steps.map(function(step) {
                if (step.flow_step_index === targetStep.flow_step_index) {
                    return Object.assign({}, step, {
                        state : 'unsupported'
                    })
                }
                return step
            })
        }
    }

    const job = await createStepJob(clientId, projectKey, flowRun, targetStep)

    return {
        jobs  : [job],
        state : 'running',
        steps : steps.map(function(step) {
            if (step.flow_step_index === targetStep.flow_step_index) {
                return Object.assign({}, step, {
                    job_id : job._id,
                    state  : 'pending'
                })
            }
            return step
        })
    }

}

const statusPayload = async function(clientId, projectKey, flowRun) {

    const jobs = await getFlowRunJobs(clientId, projectKey, flowRun.flow_run_key)

    return {
        flow_run : flowRun,
        jobs     : jobs,
        summary  : flowRunSummary(flowRun, jobs)
    }

}

const flowRunSummary = function(flowRun, jobs) {

    const jobCounts = {
        cancelled: 0,
        error  : 0,
        ok     : 0,
        paused : 0,
        pending: 0,
        running: 0
    }
    const steps = flowRun.flow_steps || []
    const currentStep = steps.find(function(step) {
        return step.flow_step_index === flowRun.current_step_index
    }) || null
    let nextAction = 'worker'

    ;(jobs || []).forEach(function(job) {
        if (typeof jobCounts[job.state] === 'number') jobCounts[job.state]++
    })

    if (flowRun.state === 'ok') nextAction = 'done'
    else if (flowRun.state === 'error') nextAction = 'error'
    else if (flowRun.state === 'cancelled') nextAction = 'cancelled'
    else if (flowRun.state === 'paused' && currentStep && isManualStep(currentStep)) nextAction = 'manual'
    else if (flowRun.state === 'paused' && currentStep && currentStep.state === 'unsupported') nextAction = 'unsupported'
    else if (flowRun.state === 'paused') nextAction = 'paused'
    else if (jobCounts.running > 0 || jobCounts.pending > 0) nextAction = 'worker'
    else nextAction = 'none'

    return {
        current_step : currentStep ? {
            flow_step_index: currentStep.flow_step_index,
            flow_step_key  : currentStep.flow_step_key,
            instructions   : currentStep.instructions || null,
            job_type       : currentStep.job_type,
            state          : currentStep.state,
            step_kind      : currentStep.step_kind || 'worker',
            worker_supported: currentStep.worker_supported === true
        } : null,
        job_counts  : jobCounts,
        next_action : nextAction,
        step_counts : {
            blocked: steps.filter(function(step) { return step.state === 'blocked' }).length,
            cancelled: steps.filter(function(step) { return step.state === 'cancelled' }).length,
            error  : steps.filter(function(step) { return step.state === 'error' }).length,
            ok     : steps.filter(function(step) { return step.state === 'ok' }).length,
            paused : steps.filter(function(step) { return step.state === 'paused' }).length,
            pending: steps.filter(function(step) { return step.state === 'pending' }).length,
            unsupported: steps.filter(function(step) { return step.state === 'unsupported' }).length
        }
    }

}

// ROUTES

router.all([
    '/:v/flows',
    '/:v/flows*',
    '/:v/projects/:project_key/flow-runs',
    '/:v/projects/:project_key/flow-runs*',
    '/:v/projects/:project_key/flows',
    '/:v/projects/:project_key/flows*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
])

// FLOWS

router.get('/:v/flows', function(req, res) {

    respond(res, 200, {
        flows : flowDefinitions.flows.map(publicFlow)
    })

})

router.get('/:v/flows/:flow_key', function(req, res) {

    const flow = flowDefinitions.byKey[req.params.flow_key]

    if (!flow) return respond(res, 404, {
        error : 'flow not found'
    })

    respond(res, 200, {
        flow : publicFlow(flow)
    })

})

router.post('/:v/projects/:project_key/flows/:flow_key/runs', async function(req, res) {

    const clientId = getClientId(req)
    const flow = flowDefinitions.byKey[req.params.flow_key]
    const jobs = []
    const flowRunKey = req.body.flow_run_key || uuid.v4()
    const errors = []
    let flowRun = null
    let stepPlan = []

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    if (!flow) return respond(res, 404, {
        error : 'flow not found'
    })

    flow.steps.forEach(function(step) {
        const payload = mergedPayload(req, step)
        const missing = missingFields(payload, step.required_fields)

        if (missing.length > 0) {
            errors.push({
                flow_step_key : step.flow_step_key,
                job_type      : step.job_type,
                missing       : missing
            })
        }
    })

    if (errors.length > 0) return respond(res, 400, {
        error  : 'flow payload is missing required fields',
        errors : errors
    })

    stepPlan = buildStepPlan(req, flow)

    try {
        flowRun = await createFlowRun({
            client_id          : clientId,
            content_profile    : req.body.content_profile || flow.content_profile,
            current_step_index : 1,
            flow_key           : flow.flow_key,
            flow_name          : flow.flow_name,
            flow_run_key       : flowRunKey,
            flow_steps         : stepPlan,
            project_key        : req.params.project_key,
            project_type       : flow.project_type,
            prompt_profile     : req.body.prompt_profile || flow.prompt_profile || 'default',
            state              : 'running'
        })

        const result = await createRunnableStep(clientId, req.params.project_key, flowRun, stepPlan, 1)
        jobs.push(...result.jobs)
        flowRun = await updateFlowRun(clientId, req.params.project_key, flowRun.flow_run_key, {
            flow_steps : result.steps,
            state      : result.state
        })
    } catch(err) {
        return respond(res, 500, {
            error : err && err.message ? err.message : 'could not create flow jobs'
        })
    }

    respond(res, 200, {
        flow     : publicFlow(flow),
        flow_run : {
            flow_key     : flow.flow_key,
            flow_run_key : flowRunKey,
            jobs_created : jobs.length,
            project_key  : req.params.project_key,
            state        : flowRun.state
        },
        jobs : jobs
    })

})

router.post('/:v/projects/:project_key/flow-runs/:flow_run_key/resume', async function(req, res) {

    const clientId = getClientId(req)

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    try {
        const flowRun = await getFlowRun(clientId, req.params.project_key, req.params.flow_run_key)

        if (!flowRun) return respond(res, 404, {
            error : 'flow run not found'
        })

        if (flowRun.state !== 'paused') return respond(res, 400, {
            error : 'flow run is not paused'
        })

        const currentStepIndex = flowRun.current_step_index || 1
        const completedSteps = (flowRun.flow_steps || []).map(function(step) {
            if (step.flow_step_index === currentStepIndex && isManualStep(step)) {
                return Object.assign({}, step, {
                    completed_by : req.body.completed_by || null,
                    note         : req.body.note || null,
                    state        : 'ok'
                })
            }
            return step
        })
        const nextStepIndex = currentStepIndex + 1
        const result = await createRunnableStep(clientId, req.params.project_key, flowRun, completedSteps, nextStepIndex)
        const updatedRun = await updateFlowRun(clientId, req.params.project_key, flowRun.flow_run_key, {
            current_step_index : result.state === 'ok' ? currentStepIndex : nextStepIndex,
            flow_steps         : result.steps,
            state              : result.state
        })
        respond(res, 200, await statusPayload(clientId, req.params.project_key, updatedRun))
    } catch(err) {
        respond(res, 500, {
            error : err && err.message ? err.message : 'could not resume flow run'
        })
    }

})

router.post('/:v/projects/:project_key/flow-runs/:flow_run_key/cancel', async function(req, res) {

    const clientId = getClientId(req)

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    try {
        const flowRun = await getFlowRun(clientId, req.params.project_key, req.params.flow_run_key)

        if (!flowRun) return respond(res, 404, {
            error : 'flow run not found'
        })

        const steps = (flowRun.flow_steps || []).map(function(step) {
            if (step.state === 'ok') return step
            return Object.assign({}, step, {
                state : 'cancelled'
            })
        })

        await setFlowRunJobs(clientId, req.params.project_key, flowRun.flow_run_key, {
            $in : ['pending', 'running', 'paused']
        }, {
            job_finished : new Date(),
            state        : 'cancelled'
        })

        const updatedRun = await updateFlowRun(clientId, req.params.project_key, flowRun.flow_run_key, {
            flow_steps : steps,
            state      : 'cancelled'
        })

        respond(res, 200, await statusPayload(clientId, req.params.project_key, updatedRun))
    } catch(err) {
        respond(res, 500, {
            error : err && err.message ? err.message : 'could not cancel flow run'
        })
    }

})

router.post('/:v/projects/:project_key/flow-runs/:flow_run_key/pause', async function(req, res) {

    const clientId = getClientId(req)

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    try {
        const flowRun = await getFlowRun(clientId, req.params.project_key, req.params.flow_run_key)

        if (!flowRun) return respond(res, 404, {
            error : 'flow run not found'
        })

        if (['ok', 'error', 'cancelled'].indexOf(flowRun.state) >= 0) return respond(res, 400, {
            error : 'flow run cannot be paused'
        })

        const steps = (flowRun.flow_steps || []).map(function(step) {
            if (step.state !== 'pending') return step
            return Object.assign({}, step, {
                state : 'paused'
            })
        })

        await setFlowRunJobs(clientId, req.params.project_key, flowRun.flow_run_key, 'pending', {
            state : 'paused'
        })

        const updatedRun = await updateFlowRun(clientId, req.params.project_key, flowRun.flow_run_key, {
            flow_steps : steps,
            state      : 'paused'
        })

        respond(res, 200, await statusPayload(clientId, req.params.project_key, updatedRun))
    } catch(err) {
        respond(res, 500, {
            error : err && err.message ? err.message : 'could not pause flow run'
        })
    }

})

router.post('/:v/projects/:project_key/flow-runs/:flow_run_key/retry-current', async function(req, res) {

    const clientId = getClientId(req)

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    try {
        const flowRun = await getFlowRun(clientId, req.params.project_key, req.params.flow_run_key)

        if (!flowRun) return respond(res, 404, {
            error : 'flow run not found'
        })

        if (flowRun.state !== 'error') return respond(res, 400, {
            error : 'flow run is not in error state'
        })

        const currentStepIndex = flowRun.current_step_index || 1
        const steps = flowRun.flow_steps || []
        const currentStep = steps.find(function(step) {
            return step.flow_step_index === currentStepIndex
        })

        if (!currentStep) return respond(res, 400, {
            error : 'current step not found'
        })

        if (isManualStep(currentStep) || isUnsupportedStep(currentStep)) return respond(res, 400, {
            error : 'current step cannot be retried as a worker job'
        })

        const retryBaseRun = Object.assign({}, flowRun, {
            state : 'running'
        })
        const resetSteps = steps.map(function(step) {
            if (step.flow_step_index !== currentStepIndex) return step
            return Object.assign({}, step, {
                retry_of_job_id: step.job_id || null,
                state          : 'pending'
            })
        })
        const result = await createRunnableStep(clientId, req.params.project_key, retryBaseRun, resetSteps, currentStepIndex)
        const updatedRun = await updateFlowRun(clientId, req.params.project_key, flowRun.flow_run_key, {
            flow_steps : result.steps,
            state      : result.state
        })

        respond(res, 200, await statusPayload(clientId, req.params.project_key, updatedRun))
    } catch(err) {
        respond(res, 500, {
            error : err && err.message ? err.message : 'could not retry flow run'
        })
    }

})

router.get('/:v/projects/:project_key/flow-runs/:flow_run_key', async function(req, res) {

    const clientId = getClientId(req)

    if (!clientId) return respond(res, 401, {
        error : 'client is required'
    })

    try {
        const flowRun = await getFlowRun(clientId, req.params.project_key, req.params.flow_run_key)

        if (!flowRun) return respond(res, 404, {
            error : 'flow run not found'
        })

        respond(res, 200, await statusPayload(clientId, req.params.project_key, flowRun))
    } catch(err) {
        respond(res, 500, {
            error : err && err.message ? err.message : 'could not read flow run'
        })
    }

})

// ---

module.exports = router
