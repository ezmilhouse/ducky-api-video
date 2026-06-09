const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'shotlists', schemas.Shotlist, {}, {}, ['shotlist', 'shotlists'])

// ---

module.exports = service
