const makeController = require(__sevdir + '/resources/controller_factory')

module.exports = makeController({
    cli_key  : 'caption_id',
    key      : 'caption_key',
    plural   : 'captions',
    singular : 'caption'
})
