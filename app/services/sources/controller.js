const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'source_id',
    key      : 'source_key',
    plural   : 'sources',
    singular : 'source'
})
