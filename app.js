const _              = require('underscore')
const path           = require('path')
const compression    = require('express-compression')
const cookieParser   = require('cookie-parser')
const express        = require('express')
const express_upload = require('express-fileupload')
const http           = require('http')
const mongoose       = require('mongoose')
const qs             = require('qs')
const timeout        = require('connect-timeout')
const zlib           = require('zlib')

// GLOBALS

global._            = _
global.__app        = path.resolve(__dirname) + '/app' // this file
global.__appdir     = path.resolve(__dirname)
global.__dbsdir     = path.resolve(__dirname) + '/app/db'
global.__mdwdir     = path.resolve(__dirname) + '/app/middleware'
global.__bsedir     = path.resolve(__dirname) + '/app/base'
global.__pubdir     = path.resolve(__dirname) + '/public'
global.__regdir     = path.resolve(__dirname) + '/app/registry'
global.__sevdir     = path.resolve(__dirname) + '/app/services'

// GLOBALS: APP

let app             = express()
let cache           = {}
let db              = {}
let env             = require(__dirname +'/env.json')
let mode            = process.env.NODE_ENV || env.mode || 'development'
let schemas         = require(path.resolve(__dirname) + '/app/registry/schemas')
let server          = http.createServer(app)

let states          = {
    mongo  : {
        state : 'idle'
    },
    node  : {
        state : 'idle'
    }
}
let version         = process.env.VERSION || env.mode || '0.0.0-local'

// overwrite based on incoming mode and release number
env.mode            = mode
env.version         = version

// export essentials for them to be globally available
// for require in other modules. 
module.exports = {
    app     : app,
    cache   : cache,
    db      : db,
    env     : env,
    schemas : schemas,
    server  : server
}

// DB

mongoose.connect(env.mongo.url, {
    autoIndex          : env.mongo.auto_index,
    useCreateIndex     : true,
    useNewUrlParser    : true,
    useUnifiedTopology : true
})

// open connection, keep open
db = mongoose.connection

db.on('error', function(err) {
    console.log('MongoDB Error: Could not connect.', err)
})

// APP: SETTINGS

// important, enhanced query string parsing (eg. [])
app.set('query parser', 'extended')

// important, behind nginx
app.set('trust proxy', 1)

// APP: MIDDLEWARE

// 1. REQUEST AUTHENTICATION

app.use(cookieParser())

// 2. REQUEST RESPONSE COMPRESSION

// handles request repsonse compression using zlib
app.use(compression({
    level     : zlib.Z_BEST_SPEED,
    memLevel  : zlib.Z_DEFAULT_MEMLEVEL,
    strategy  : zlib.Z_DEFAULT_STRATEGY,
    threshold : '1kb'
}))

// 3. REQUEST TIMEOUTS

// handles request timeouts
app.use(timeout(env.express.request_max_timeout))

// 4. REQUEST BODIES

// handles request with file uploads attached
app.use(express.json({ 
    limit : env.express.request_max_filesize, 
    verify : function(req, res, buf) {
        req.rawBody = buf.toString()
    }
}))

// handles requests via POST/PUT and tehir incoming 
// payloads
app.use(express.urlencoded({ 
    extended: true 
}))

// 5. REQUEST WITH FILE

// handles requests that come with file uploads attached,
// adds req.files[FILE_INPUT_FIELD_NAME].size and other
// options
app.use(express_upload({
    limits : {
        fileSize : env.express.request_max_filesize
    }
}))

// 6. REQUEST TIMEOUT, CATCH-ALL

// handles request timeouts, functions as a catch-all;
// always put last in your middleware stack
app.use(function(req, res, next) {
    if (!req.timedout) next()
})

// APP: SERVICES

require('./app/registry/services')
require('./app/registry/controllers')

// APP: ROUTES

app.use('/api', require('./app/registry/routes_api'))

// APP: LAUNCH

if (states.mongo.state === 'idle') {
    db.on('open', function() {
        console.log('ok ... mongodb running ... | ' + env.mongo.url)
        states.mongo.state = 'running'
        if (states.node.state === 'idle') {
            server.listen(env.http.port, function() {
                console.log('ok ... node running ...    | ' + env.http.host + ':' + env.http.port)
                console.log('ok ... version running ... | ' + env.version)
                states.node.state = 'running'
            })
        }
    })
}
