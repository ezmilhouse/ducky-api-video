const app     = require(__app).app
const schemas = require(__app).schemas
const Service = require(__bsedir + '/Service')

// SERVICE

const service = new Service(app, 'team_invites', schemas.TeamInvite, {}, {}, ['team_invite', 'team_invites'])

// ---

module.exports = service
