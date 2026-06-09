const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const clients  = controllers.clients
const projects = controllers.projects

// ROUTES

router.all([
    '/:v/projects',
    '/:v/projects*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
])

// PROJECTS

router.get('/:v/projects', projects.list)
router.post('/:v/projects', projects.upsert)
router.get('/:v/projects/:project_key', projects.get)
router.put('/:v/projects/:project_key', projects.upsert)

// ---

module.exports = router
