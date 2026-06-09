const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const auth         = controllers.auth
const clients      = controllers.clients
const team_invites = controllers.team_invites

// ROUTES

router.all([
    '/:v/team-invites',
    '/:v/team-invites*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify,
    auth.permissions.verify
])

// TEAM INVITES

router.post('/:v/team-invites', team_invites.create)

// ---

module.exports = router
