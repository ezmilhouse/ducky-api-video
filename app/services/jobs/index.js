const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'jobs', schemas.Job, {}, {}, ['job', 'jobs'])

// ---

module.exports = service
