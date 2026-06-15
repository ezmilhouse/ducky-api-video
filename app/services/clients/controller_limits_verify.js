const rateLimit       = require('express-rate-limit')

// CONTROLLER

const limitsVerify = rateLimit({

    windowMs : 15 * 60 * 1000, // 15 minutes
    max      : 10000,          // 10 attempts per IP per 15 minutes
    message  : 'Too many authentication attempts, please try again later.'

})

module.exports = limitsVerify
