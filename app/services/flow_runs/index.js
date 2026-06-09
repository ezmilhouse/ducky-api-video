const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'flow_runs', schemas.FlowRun, {}, {}, ['flow_run', 'flow_runs'])

// ---

module.exports = service
