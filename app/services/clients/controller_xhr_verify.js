const app  = require(__app).app
const flow = require('async')
const util = require(__bsedir + '/util')

/**
 * @method xhrVerify()
 * Attaches per-request API wrappers for all clients in app.xhr to req.clients
 *
 * Flow:
 * - Builds a merge_options helper for caller-provided request options
 * - Wraps each client in app.xhr, preserving method signatures
 * - Exposes wrapped clients on req.clients[client_name]
 * - Supports both Express middleware and event-based invocation
 *
 * @param   {object}   req  - Express request object or simulated event request object
 * @param   {object}   res  - Express response object (optional in event usage)
 * @param   {function} next - Express next middleware function or event callback
 */
const xhrVerify = function(req, res, next) {

    let is_event
    let is_done

    is_event = typeof next !== 'function' && typeof res === 'function'
    is_done  = is_event ? res : next

    if (typeof req.clients !== 'object' || req.clients === null) {
        req.clients = {}
    }

    function requestMergeOptions(options) {

        let opts
        let hdrs

        opts = options || {}
        hdrs = opts.headers || {}

        opts.headers = hdrs

        return opts

    }

    function DEPRECATEDrequestMethodsWrap(base) {

        let wrapped

        wrapped = {}

        if (typeof base.get === 'function') {
            wrapped.get = function(url, options, fn) {

                if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.get(url, requestMergeOptions(options), fn)

            }
        }

        if (typeof base.post === 'function') {
            wrapped.post = function(url, body, options, fn) {

                if (typeof body === 'function') {
                    fn = body
                    body = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.post(url, body, requestMergeOptions(options), fn)

            }
        }

        if (typeof base.put === 'function') {
            wrapped.put = function(url, body, options, fn) {

                if (typeof body === 'function') {
                    fn = body
                    body = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.put(url, body, requestMergeOptions(options), fn)

            }
        }

        if (typeof base.patch === 'function') {
            wrapped.patch = function(url, body, options, fn) {

                if (typeof body === 'function') {
                    fn = body
                    body = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.patch(url, body, requestMergeOptions(options), fn)

            }
        }

        if (typeof base.delete === 'function') {
            wrapped.delete = function(url, body, options, fn) {

                if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                if (typeof body === 'function') {
                    fn = body
                    body = {}
                    options = {}
                }

                return base.delete(url, body, requestMergeOptions(options), fn)

            }

            wrapped.del = wrapped.delete
        }

        _.each(base, function(val, key) {
            if (wrapped[key] == null) {
                wrapped[key] = val
            }
        })

        return wrapped

    }

    function requestMethodsWrap(base) {

        let wrapped

        wrapped = {}

        if (typeof base.get === 'function') {
            wrapped.get = function(url, data, options, fn) {

                if (typeof data === 'function') {
                    fn = data
                    data = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.get(url, data, requestMergeOptions(options || {}), fn)

            }
        }

        if (typeof base.post === 'function') {
            wrapped.post = function(url, data, options, fn) {

                if (typeof data === 'function') {
                    fn = data
                    data = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.post(url, data, requestMergeOptions(options || {}), fn)

            }
        }

        if (typeof base.put === 'function') {
            wrapped.put = function(url, data, options, fn) {

                if (typeof data === 'function') {
                    fn = data
                    data = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.put(url, data, requestMergeOptions(options || {}), fn)

            }
        }

        if (typeof base.patch === 'function') {
            wrapped.patch = function(url, data, options, fn) {

                if (typeof data === 'function') {
                    fn = data
                    data = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.patch(url, data, requestMergeOptions(options || {}), fn)

            }
        }

        if (typeof base.del === 'function') {
            wrapped.del = function(url, data, options, fn) {

                if (typeof data === 'function') {
                    fn = data
                    data = {}
                    options = {}
                } else if (typeof options === 'function') {
                    fn = options
                    options = {}
                }

                return base.del(url, data, requestMergeOptions(options || {}), fn)

            }

            wrapped.delete = wrapped.del
        }

        _.each(base, function(val, key) {
            if (wrapped[key] == null) {
                wrapped[key] = val
            }
        })

        return wrapped

    }

    _.each(app.xhr, function(client, name) {
        if (client && typeof client === 'object') {
            req.clients[name] = requestMethodsWrap(client)
        }
    })

    app.xhr.auth = function() {
        return req.clients
    }

    if (typeof is_done === 'function') return is_done()

}

// EXPORTS

app.on('service:xhr:controller:verify', function(data, fn) {

    let req
    let res
    let next

    req  = data && (data.req || data)
    res  = typeof fn === 'function' ? fn : null
    next = null

    xhrVerify(req, res, next)

})

module.exports = xhrVerify
