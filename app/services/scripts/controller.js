const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'script_id',
    key      : 'script_key',
    plural   : 'scripts',
    singular : 'script'
})
