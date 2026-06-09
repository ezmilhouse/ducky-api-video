const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'edit_id',
    key      : 'edit_key',
    plural   : 'edits',
    singular : 'edit'
})
