const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const clients = controllers.clients

// ROUTES

router.all('/:v/status',
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
)

router.get('/:v/status', function(req, res) {
    res.status(200).json({
        service : 'ducky-api-video',
        status  : 'ok'
    })
})

// ---

module.exports = router
