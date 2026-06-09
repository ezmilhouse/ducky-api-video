const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const auth  = controllers.auth
const clients = controllers.clients
const teams = controllers.teams

// ROUTES

router.all([
    '/:v/teams',
    '/:v/teams*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify,
    auth.permissions.verify
])

// TEAMS

router.get('/:v/teams/current', teams.current)
router.post('/:v/teams', teams.create)

// ---

module.exports = router
