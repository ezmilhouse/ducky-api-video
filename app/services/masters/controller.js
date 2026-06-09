const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'master_id',
    key      : 'master_key',
    plural   : 'masters',
    singular : 'master'
})
