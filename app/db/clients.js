let env = require(__app).env

// IMPORTANT

// this is the list of registered clients, apps that are allowed
// to communicate with the API; keys here must match keys in the
// app's env.json (services.app.api.client_key, client_secret)

let collection = [

    // APP
    // incoming client used to make requests to api resources

    {
        client_host         : env.platform.app.host,
        client_key          : 'pler-peac-demp-krel-wrog-day',
        client_name         : 'app',
        client_name_display : 'App',
        client_permissions  : [
            'sign',
            'sign_cookie'
        ],
        client_roles        : [
            'user'
        ],
        client_secret       : 'UsRov6zPfq4UkhzsrCYtUBWiYA9P7buiKNJszKxe'
    },

    // CLI
    // incoming client used by ducky_cli connected mode and worker actions

    {
        client_host         : 'ducky-cli',
        client_key          : 'ducky-cli-local-client',
        client_name         : 'cli',
        client_name_display : 'CLI',
        client_permissions  : [
            'sign'
        ],
        client_roles        : [
            'worker'
        ],
        client_secret       : '9lBRby28g3QKMOYlOY+xV/EjE223YVeYMAipS+SB0qoo2Irw'
    }

]

module.exports = {
    collection : collection
}
