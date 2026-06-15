module.exports = {

    keys       : {
        verify : require('./controller_keys_verify'),
    },
    limits : {
        verify : require('./controller_limits_verify'),
    },
    signatures : {
        create : require('./controller_signatures_create'),
        verify : require('./controller_signatures_verify')
    },
    xhr    : {
        verify : require('./controller_xhr_verify')
    }
    
}