const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'teams', schemas.Team, {}, {}, ['team', 'teams'])

// ---

module.exports = service
