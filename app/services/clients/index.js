const app      = require(__app).app
const clients  = require(global.__dbsdir + '/clients')
const lib      = require('./lib')
const schemas  = require(__app).schemas
const Service  = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'clients', schemas.Client, {}, {}, ['client', 'clients'])

// ---

lib.fill(clients.collection, app)

// ---

module.exports = service