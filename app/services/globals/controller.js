const app      = require(__app).app
const env      = require(__app).env
const defaults = require(__dbsdir + '/defaults')
const moment   = require('moment-timezone')
const util     = require(__bsedir + '/util')

// CONTROLLER

const createGlobals = function(req, res, next) {

    // init global request object
    req.globals = req.globals ? req.globals : {}

    // init locals request object (used between routes)
    req.locals = req.locals ? req.locals : {}

    next()

}

const createGlobalsData = function(req, res, next) {

    // skip
    // if no globals object
    if (!req.globals) return next()

    const device        = util.getDevice(req.headers['user-agent'])
    const time_utc      = util.getTimeLocal('UTC', defaults)
    const time_local_tz = util.getTimeLocalTimezone(req)
    const time_local    = util.getTimeLocal(time_local_tz.timezone, defaults)

    // PRIVATE

    // will be available at the root level for templates
    // to render properly, NOT exposed to DOM

    _.extend(req.globals, {
        data : {
            defaults   : defaults, 
            env        : env,
            moment     : moment,
            paths      : {
                ejs : process.cwd()
            },
            req        : {
                hostname : req.hostname,
                device   : device,
                params   : req.params,
                // Make query dynamic - use getter function
                get query() { return req.query },
                url      : req.url,
                xhr      : !req.xhr ? req.query && req.query.xhr === 'true' : true
            },
            time_utc   : time_utc,
            time_local : time_local,
            util       : util
        }
    })

    _.extend(req.globals, {
        page : {
            dom_components : [],
            dom_layout     : [],
            page_group     : [], 
            page_layout    : null, 
            page_name      : null,
            page_template  : null,
            page_title     : null
        }
    })

    next()

}

const createGlobalsDataClient = function(req, res, next) {

    // skip
    // if no globals object
    if (!req.globals) return next()

    const device        = util.getDevice(req.headers['user-agent'])
    const time_utc      = util.getTimeLocal('UTC', defaults)
    const time_local_tz = util.getTimeLocalTimezone(req)
    const time_local    = util.getTimeLocal(time_local_tz.timezone, defaults)
    
    // PUBLIC
    
    // will be exposed in DOM, NEVER add sensitive data

    _.extend(req.globals, {
        data_client : {
            defaults : {
                time     : defaults.time,
                timezone : defaults.timezone
            },
            env        : {
                http     : {
                    app  : env.http.app,
                    host : env.http.host,
                    root : env.http.root,
                    tld  : env.http.tld
                },
                extensions     : env.extensions, 
                platform       : {
                    app : env.platform.app
                },
                mode           : env.mode,
                mode_app       : env.mode_app,
                mode_css       : env.mode_css,
                mode_css_theme : env.mode_css_theme,
                mode_js        : env.mode_js,
                services       : {
                    app : {
                        api  : {
                            client_key            : env.services.app.api && env.services.app.api.client_key,
                            service_endpoint      : env.services.app.api && env.services.app.api.service_endpoint,
                            service_endpoint_sign : env.services.app.api && env.services.app.api.service_endpoint_sign
                        }
                    }
                },
                session_sign   : {
                    name   : env.session_sign && env.session_sign.name,
                    cookie : {
                        maxAge : env.session_sign && env.session_sign.cookie && env.session_sign.cookie.maxAge
                    }
                }
            },
            req        : {
                hostname : req.hostname,
                device   : device,
                params   : req.params,
                // Make query dynamic - use getter function
                get query() { return req.query },
                url      : req.url
            },
            time_utc   : time_utc,
            time_local : time_local
        }  
    })

    next()

}

// EXPORT

module.exports = {
    createGlobals,
    createGlobalsData,
    createGlobalsDataClient
}
