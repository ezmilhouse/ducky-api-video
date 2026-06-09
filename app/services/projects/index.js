const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'projects', schemas.Project, {}, {}, ['project', 'projects'])

// ---

module.exports = service
