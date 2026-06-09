const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'shotlist_id',
    key      : 'shotlist_key',
    plural   : 'shotlists',
    singular : 'shotlist'
})
