const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'voiceover_id',
    key      : 'voiceover_key',
    plural   : 'voiceovers',
    singular : 'voiceover'
})
