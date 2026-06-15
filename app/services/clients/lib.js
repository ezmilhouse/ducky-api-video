const app             = require(__app).app
const axios           = require('axios')
const env             = require(__app).env
const flow            = require('async')
const https           = require('https')
const lib             = {
    auth : require(__sevdir + '/auth/lib')
}
const util            = require(__bsedir + '/util')
const validate        = require(__bsedir + '/validate').validate
const validatePayload = require(__bsedir + '/validate').validatePayload

// LIB

/**
 * Creates a clean options object without client-specific properties.
 * 
 * @param   {object} options - Original options object
 * @returns {object} Options object without client-specific properties
 */
const _cleanOptions = function(options) {

    if (!options) return {}
    
    // create a copy of options
    let clean_options = { ...options }
    
    // remove client-specific properties
    delete clean_options.client_key
    delete clean_options.client_secret
    delete clean_options.client_referer
    
    return clean_options

}

/**
 * Extracts client information from options object.
 * 
 * @param   {object} options - Options object that may contain client information
 * @returns {object|string}  Client object or client_key string
 */
const _extractClientInfo = function(options) {

    if (!options) return null

    // Create a client object with all relevant properties
    let client = {
        client_key     : options.client_key || null,
        client_referer : options.client_referer || null
    }
    
    // Add client_secret if available
    if (options.client_secret) {
        client.client_secret = options.client_secret
        return client
    }
    
    // If no client_secret but we have client_key and client_referer
    if (options.client_key && options.client_referer) {
        return client
    }
    
    // otherwise, just return the client_key
    return options.client_key || null

}

/**
 * Makes a signed API request to a service endpoint with automatic client resolution.
 * 
 * Flow:
 * - Resolves client from key if client object not provided
 * - Validates request parameters (client/client_key, method, URL)
 * - Prepares signed request configuration with proper headers
 * - Handles request body appropriately based on HTTP method
 * - Executes HTTP request with authentication
 * - Processes response and handles errors consistently
 * - Returns parsed response data through callback
 *
 * @param   {object|string} client_or_key - Client object or client_key string
 * @param   {string}   method      - HTTP method (GET, POST, PUT, DELETE)
 * @param   {string}   url         - Request URL endpoint
 * @param   {object}   body        - Optional request body for POST/PUT/DELETE methods
 * @param   {object}   options     - Optional request configuration overrides
 * @param   {function} fn    - Callback function(err, data)
 * @returns {void}
 */
const _makeSignedRequest = function(client_or_key, method, url, body = {}, options = {}, fn = function() {}) {

    // handle optional parameters
    if (typeof options === 'function') {
        fn = options
        options = {}
    }
    
    if (typeof body === 'function') {
        fn = body
        body = null
        options = {}
    }
    
    // normalize method to uppercase
    method = (method || 'GET').toUpperCase()
    
    // prepare results object
    let results = {
        client          : null,
        client_key      : typeof client_or_key === 'object' ? client_or_key.client_key : client_or_key,
        client_referer  : typeof client_or_key === 'object' ? client_or_key.client_referer : null,
        client_secret   : null,
        mode            : env.mode || 'development',
        request_body    : body || {},
        request_config  : null,
        request_method  : method,
        request_options : options || {},
        request_url     : url,
        response        : null
    }
    
    const validations = {
        data    : {
            client_key      : ['is_required'],
            client_referer  : ['is_optional'], // Changed to optional since it might not be available
            request_body    : ['is_optional'],
            request_method  : ['is_required', ['is_in_list', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']]],
            request_options : ['is_optional'],
            request_url     : ['is_required']
        }
    }
    
    // process request with flow waterfall
    flow.waterfall([
        function(cb) {

            // VALIDATE

            // overwrite
            results.data = {
                client_key      : results.client_key,
                client_referer  : results.client_referer,
                request_body    : results.request_body,
                request_method  : results.request_method,
                request_options : results.request_options,
                request_url     : results.request_url
            }

            validate(validations.data, results.data, util.origin(), cb)

        },
        function(cb) {
            
            // GET: CLIENT
            
            const query = {
                client_key : results.client_key
            }
            
            // If client_or_key is already an object with client_secret, use it directly
            if (typeof client_or_key === 'object' && client_or_key.client_secret) {
                results.client = client_or_key;
                return cb();
            }
            
            app.emit('service:clients:get', {
                query : query,
                limit : 1
            }, function(err, data) {
                
                if (err) return cb(util.flow.err({
                    err : err
                }))
                
                if (!data.client) return cb(util.flow.err({
                    data    : {
                        query : query
                    },
                    message : 'Client not found for API request.',
                    status  : 401
                }))
                
                results.client = data.client

                cb()
                
            })
            
        },
        function(cb) {

            // PREPARE: SIGNED REQUEST CONFIG
        
            let request_config = _prepareSignedRequest(
                results.client,
                results.request_method,
                results.request_url,
                results.request_body
            )
        
            if (!request_config) {
                return cb(util.flow.err({
                    data    : {
                        client         : {
                            client_key : results.client.client_key
                        },
                        request_method : results.request_method,
                        request_url    : results.request_url
                    },
                    message : 'Could not prepare signed request configuration.'
                }))
            }
        
            results.request_config = request_config
        
            // HEADERS: ADD DEFAULTS
        
            if (!results.request_config.headers) {
                results.request_config.headers = {}
            }
        
            if (results.client_referer) {
                results.request_config.headers['Origin']  = results.client_referer
                results.request_config.headers['Referer'] = results.client_referer
            }
        
            results.request_config.headers['User-Agent'] = 'app'
        
            // HEADERS: EXTRACT SIGNING HEADERS
        
            let auth_headers = {
                'X-Client-Key'       : results.request_config.headers['X-Client-Key'],
                'X-Timestamp'        : results.request_config.headers['X-Timestamp'],
                'X-Client-Signature' : results.request_config.headers['X-Client-Signature']
            }
        
            // OPTIONS: MERGE HEADERS & CONFIG
        
            if (results.request_options && typeof results.request_options === 'object') {
        
                let user_headers = results.request_options.headers || {}
        
                results.request_config.headers = {
                    ...results.request_config.headers,
                    ...user_headers,
                    ...auth_headers
                }
        
                delete results.request_options.headers
        
                results.request_config = {
                    ...results.request_config,
                    ...results.request_options
                }
        
            }
        
            // MODE: ALLOW SELF-SIGNED CERTIFICATES IN DEVELOPMENT
        
            if (results.mode === 'development') {
                results.request_config.httpsAgent = new https.Agent({
                    rejectUnauthorized : false
                })
            }
        
            cb()
        
        },        
        function(cb) {
            
            // MAKE API REQUEST

            console.log('[xhr] request:', results.request_method, results.request_url)

            axios(results.request_config)
                .then(function(res) {
                    console.log('[xhr] response:', results.request_method, results.request_url, res ? res.status : 'null')
                
                    if (!res) {
                        return cb(util.flow.err({
                            data    : {
                                config : results.request_config
                            },
                            message : 'Empty response received from API.'
                        }))
                    }
                    
                    results.response = {
                        data    : res.data,
                        status  : res.status,
                        headers : res.headers,
                        config  : res.config
                    }
                    
                    return cb()
                
                })
                .catch(function(err) {

                    console.log('[xhr] error:', results.request_method, results.request_url, err ? err.message || err.code : 'unknown')

                    let data = null
                    let url  = null

                    // IMPORTANT

                    // if something bubbles up at this point, then the app
                    // is leaking or at least missing some proper error
                    // handling, most likely missing url, or missing error
                    // handling in an api controller

                    if (env.mode === 'development') { 

                        if (err && err.response && err.response.data) {
                            data = err.response.data
                        }
                        if (err && err.response && err.response.config && err.response.config.url) {
                            url = err.response.config.url
                        }

                        if (data && data.status && ([400,401,403,405,409].includes(data.status) || data.status >= 500)) {
                            console.log('[REQUEST_FAILED | REQUEST URL]', !url ? '' : url.split(env.http.tld)[1])
                            console.log('[REQUEST_FAILED | REQUEST STATUS]', data.status + ' | ' + data.message)
                            console.log('[REQUEST_FAILED | ORIGIN]', data.origin)
                            console.log('[REQUEST_FAILED| REQUEST CONFIG]', results.request_config)
                        } else {
                            console.log(err)
                        }

                    }

                    // set defaults
                    let obj = {
                        data    : !err.response || !err.response.data ? {} : err.response.data,
                        // err     : err.response,
                        message : 'Error making signed API request.',
                        request : {
                            body    : results.request_body,
                            config  : results.request_config,
                            headers : results.request_config.headers,
                            method  : results.request_method,
                            url     : results.request_url,
                        },
                        status  : !err.response || !err.response.status ? 500 : err.response.status || 500,
                        url     : url
                    }

                    // handle network errors
                    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
                        return cb(util.flow.err({
                            data    : err_data,
                            err     : err,
                            message : 'Network error: Could not connect to API server.',
                            status  : 503
                        }))
                    }
                    
                    // handle timeout errors
                    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                        return cb(util.flow.err({
                            data    : err_data,
                            err     : err,
                            message : 'Request timeout: API server did not respond in time.',
                            status  : 504
                        }))
                    }

                    // handle generic errors
                    cb(util.flow.err(obj))
                
                })
            
        }
    ], function(err) {

        console.log('[xhr] done:', results.request_method, results.request_url, err ? 'ERR' : 'ok')

        if (err) return fn(err)

        fn(null, results.response.data)
        
    })

}

/**
 * Creates a signed request configuration object for use in API requests.
 * 
 * Flow:
 * - Validates required client information and request details
 * - Generates timestamp for the request
 * - Creates signature using client credentials and request details
 * - Builds headers with authentication information
 * - Returns complete request configuration
 *
 * @param   {object}  client         - Client object with authentication details
 * @param   {string}  client.client_key      - Client API key identifier
 * @param   {string}  client.client_secret   - Client secret for signing
 * @param   {string}  method         - HTTP method (GET, POST, PUT, DELETE)
 * @param   {string}  url            - Request URL endpoint
 * @param   {object}  body           - Optional payload for POST/PUT requests
 * @returns {object}  Request configuration with headers and authentication
 */
const _prepareSignedRequest = function(client, method, url, body) {

    let request_config = {
        headers    : {},
        data       : body || null,
        method     : method,
        url        : url
    }

    // validate inputs
    if (!client) {
        return null
    }

    if (!client.client_key || !client.client_secret) {
        return null
    }

    if (!method) {
        return null
    }

    if (!url) {
        return null
    }

    // generate timestamp for the request
    let timestamp = Date.now()

    // create signature
    let signature = lib.auth._newSignature(
        client.client_key,
        timestamp,
        method,
        url,
        client.client_secret
    )

    // validate signature
    if (!signature) {
        return null
    }

    // build headers - Use consistent header names
    request_config.headers = {
        'X-Client-Key'       : client.client_key,
        'X-Timestamp'        : timestamp,
        'X-Client-Signature' : signature
    }

    // add content type for requests with body
    if (body && (method === 'POST' || method === 'PUT')) {
        request_config.headers['Content-Type'] = 'application/json'
    }

    return request_config

}

/**
 * Creates an API factory with context-specific service endpoints and credentials.
 * 
 * @param   {string} service_name  - API context identifier
 * @returns {object} API factory object with HTTP method functions
 */
const _createApiFactory = function(service_name) {
    
    let factory = {}
    
    // Determine API settings
    const service_config = env.services && env.services.app[service_name] ? env.services.app[service_name] : null
    
    if (!service_config) {
        return null
    }
    
    // Cache credentials for all requests from this factory
    const credentials = {
        client_key     : service_config.client_key || null,
        client_referer : env.http && env.http.root ? env.http.root : null
    }
    
    // Build factory HTTP methods
    factory = {
        /**
         * Makes a GET request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url      - Relative URL path to append to service endpoint
         * @param   {object}   options  - Optional request configuration overrides
         * @param   {function} fn       - Callback function(err, data)
         * @returns {void}
         */
        DEPRECATEDget : function(url, options, fn) {
            
            // handle optional parameters
            if (typeof options === 'function') {
                fn = options
                options = {}
            }
            
            // prepend service endpoint if url doesn't include it already
            let full_url = url
            if (service_config.service_endpoint && !url.startsWith('http')) {
                // Handle both cases where url starts with / or not
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }
            
            _makeSignedRequest(credentials, 'GET', full_url, options.query || null, options, fn)
        },
        
        /**
         * Makes a DELETE request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url      - Relative URL path to append to service endpoint
         * @param   {object}   body     - Optional request body
         * @param   {object}   options  - Optional request configuration overrides
         * @param   {function} fn       - Callback function(err, data)
         * @returns {void}
         */
        DEPRECATEDdelete : function(url, body, options, fn) {
            
            // handle optional parameters
            if (typeof options === 'function') {
                fn = options
                options = {}
            }
            
            if (typeof body === 'function') {
                fn = body
                body = {}
                options = {}
            }
            
            // prepend service endpoint if url doesn't include it already
            let full_url = url
            if (service_config.service_endpoint && !url.startsWith('http')) {
                // Handle both cases where url starts with / or not
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }
            
            _makeSignedRequest(credentials, 'DELETE', full_url, body, options, fn)
        },
        
        /**
         * Makes a PATCH request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url      - Relative URL path to append to service endpoint
         * @param   {object}   body     - Request body
         * @param   {object}   options  - Optional request configuration overrides
         * @param   {function} fn       - Callback function(err, data)
         * @returns {void}
         */
        DEPRECATEDpatch : function(url, body, options, fn) {
            
            // handle optional parameters
            if (typeof options === 'function') {
                fn = options
                options = {}
            }
            
            if (typeof body === 'function') {
                fn = body
                body = {}
                options = {}
            }
            
            // prepend service endpoint if url doesn't include it already
            let full_url = url
            if (service_config.service_endpoint && !url.startsWith('http')) {
                // Handle both cases where url starts with / or not
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }
            
            _makeSignedRequest(credentials, 'PATCH', full_url, body, options, fn)
        },
        
        /**
         * Makes a POST request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url      - Relative URL path to append to service endpoint
         * @param   {object}   body     - Request body
         * @param   {object}   options  - Optional request configuration overrides
         * @param   {function} fn       - Callback function(err, data)
         * @returns {void}
         */
        DEPRECATEDpost : function(url, body, options, fn) {
            
            // handle optional parameters
            if (typeof options === 'function') {
                fn = options
                options = {}
            }
            
            if (typeof body === 'function') {
                fn = body
                body = {}
                options = {}
            }
            
            // prepend service endpoint if url doesn't include it already
            let full_url = url
            if (service_config.service_endpoint && !url.startsWith('http')) {
                // Handle both cases where url starts with / or not
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }
            
            _makeSignedRequest(credentials, 'POST', full_url, body, options, fn)
        },
        
        /**
         * Makes a PUT request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url      - Relative URL path to append to service endpoint
         * @param   {object}   body     - Request body
         * @param   {object}   options  - Optional request configuration overrides
         * @param   {function} fn       - Callback function(err, data)
         * @returns {void}
         */
        DEPRECATEDput : function(url, body, options, fn) {
            
            // handle optional parameters
            if (typeof options === 'function') {
                fn = options
                options = {}
            }
            
            if (typeof body === 'function') {
                fn = body
                body = {}
                options = {}
            }
            
            // prepend service endpoint if url doesn't include it already
            let full_url = url
            if (service_config.service_endpoint && !url.startsWith('http')) {
                // Handle both cases where url starts with / or not
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }
            
            _makeSignedRequest(credentials, 'PUT', full_url, body, options, fn)
        },

        /**
         * Makes a DELETE request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url     - Relative URL path to append to service endpoint
         * @param   {object}   data    - Query parameters to send
         * @param   {object}   options - Request configuration overrides
         * @param   {function} fn      - Callback function(err, data)
         * @returns {void}
         */
        del : function(url, data, options, fn) {

            let full_url = url

            if (service_config.service_endpoint && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }

            _makeSignedRequest(credentials, 'DELETE', full_url, data || {}, options || {}, fn)

        },

        /**
         * Makes a GET request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url     - Relative URL path to append to service endpoint
         * @param   {object}   data    - Query parameters to send
         * @param   {object}   options - Request configuration overrides
         * @param   {function} fn      - Callback function(err, data)
         * @returns {void}
         */
        get : function(url, data, options, fn) {

            let full_url = url

            if (service_config.service_endpoint && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }

            _makeSignedRequest(credentials, 'GET', full_url, data || {}, options || {}, fn)

        },

        /**
         * Makes a PATCH request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url     - Relative URL path to append to service endpoint
         * @param   {object}   data    - Request body to send
         * @param   {object}   options - Request configuration overrides
         * @param   {function} fn      - Callback function(err, data)
         * @returns {void}
         */
        patch : function(url, data, options, fn) {

            let full_url = url

            if (service_config.service_endpoint && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }

            _makeSignedRequest(credentials, 'PATCH', full_url, data || {}, options || {}, fn)

        },

        /**
         * Makes a POST request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url     - Relative URL path to append to service endpoint
         * @param   {object}   data    - Request body to send
         * @param   {object}   options - Request configuration overrides
         * @param   {function} fn      - Callback function(err, data)
         * @returns {void}
         */
        post : function(url, data, options, fn) {

            let full_url = url

            if (service_config.service_endpoint && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }

            _makeSignedRequest(credentials, 'POST', full_url, data || {}, options || {}, fn)

        },

        /**
         * Makes a PUT request to the specified URL with preconfigured client authentication.
         *
         * @param   {string}   url     - Relative URL path to append to service endpoint
         * @param   {object}   data    - Request body to send
         * @param   {object}   options - Request configuration overrides
         * @param   {function} fn      - Callback function(err, data)
         * @returns {void}
         */
        put : function(url, data, options, fn) {

            let full_url = url

            if (service_config.service_endpoint && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    full_url = service_config.service_endpoint + url
                } else {
                    full_url = service_config.service_endpoint + '/' + url
                }
            }

            _makeSignedRequest(credentials, 'PUT', full_url, data || {}, options || {}, fn)

        }

    }
    
    return factory
}

/**
 * Initializes API factories for all configured services in the environment.
 * Creates a structured object with API factories for each service context.
 *
 * @returns {object} Object containing API factories for each service
 */
const _initializeApiFactories = function() {
    
    let factories = {}
    
    // skip if no services in environment
    if (!env.services.app) {
        return factories
    }
    
    // loop through all app services and create API factories for each
    Object.keys(env.services.app).forEach(function(service_name) {

        // Create factory for this service
        const factory = _createApiFactory(service_name)

        if (factory) {
            factories[service_name] = factory
        }

    })

    return factories
}

// ---

const fill = function(collection, app) {

    const origin = '/clients/lib'

    flow.eachOfSeries(collection, function(item, key, cb) {
        app.emit('service:clients:new:if', {
            query : {
                client_host : item.client_host
            },
            model : item
        }, cb)
    }, function(err, data) {
        if (err) return console.log({
            err     : err,
            message : 'Could not fill clients.',
            origin  : origin,
            status  : 400
        })
        console.log('ok ... clients added ...   | NODE_ENV=' + process.env.NODE_ENV)
    })

}

const init = function() {
    return _initializeApiFactories()
}

module.exports = {
    _cleanOptions,
    _extractClientInfo,
    _makeSignedRequest,
    _prepareSignedRequest,
    _createApiFactory,
    _initializeApiFactories,
    fill,
    init  
}
