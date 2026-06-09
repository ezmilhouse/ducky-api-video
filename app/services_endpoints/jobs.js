const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const clients = controllers.clients
const jobs    = controllers.jobs

// ROUTES

router.all([
    '/:v/jobs',
    '/:v/jobs*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
])

// JOBS

router.get('/:v/jobs', jobs.list)
router.post('/:v/jobs', jobs.create)
router.post('/:v/jobs/claim', jobs.claim)
router.put('/:v/jobs/:job_id', jobs.update)

// ---

module.exports = router
