const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'idea_id',
    key      : 'idea_key',
    plural   : 'ideas',
    singular : 'idea'
})
