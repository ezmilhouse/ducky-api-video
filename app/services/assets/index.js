const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'assets', schemas.Asset, {}, {}, ['asset', 'assets'])

// ---

module.exports = service
