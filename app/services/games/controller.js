const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'game_id',
    key      : 'game_key',
    plural   : 'games',
    singular : 'game'
})
