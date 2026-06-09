const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'scenes', schemas.Scene, {}, {}, ['scene', 'scenes'])

// ---

module.exports = service
