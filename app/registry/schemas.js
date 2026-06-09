const path = require('path')

// ---

module.exports = {
    Asset    : require('../schemas/asset.js'),
    Caption  : require('../schemas/caption.js'),
    Client   : require('../schemas/client.js'),
    Edit     : require('../schemas/edit.js'),
    FlowRun  : require('../schemas/flow_run.js'),
    Game     : require('../schemas/game.js'),
    Idea     : require('../schemas/idea.js'),
    Job      : require('../schemas/job.js'),
    Master   : require('../schemas/master.js'),
    Project  : require('../schemas/project.js'),
    Scene    : require('../schemas/scene.js'),
    Script   : require('../schemas/script.js'),
    Shotlist : require('../schemas/shotlist.js'),
    Source   : require('../schemas/source.js'),
    Team     : require('../schemas/team.js'),
    TeamInvite: require('../schemas/team_invite.js'),
    User     : require('../schemas/user.js'),
    Voiceover: require('../schemas/voiceover.js')
}
