const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'scene_id',
    key      : 'scene_key',
    plural   : 'scenes',
    singular : 'scene'
})
