const controllers = require(__regdir + '/controllers')
const router      = require('express').Router()

// CONTROLLERS

const clients = controllers.clients

const resources = [
    {
        controller : controllers.games,
        key        : 'game_key',
        plural     : 'games'
    },
    {
        controller : controllers.sources,
        key        : 'source_key',
        plural     : 'sources'
    },
    {
        controller : controllers.scenes,
        key        : 'scene_key',
        plural     : 'scenes'
    },
    {
        controller : controllers.ideas,
        key        : 'idea_key',
        plural     : 'ideas'
    },
    {
        controller : controllers.scripts,
        key        : 'script_key',
        plural     : 'scripts'
    },
    {
        controller : controllers.voiceovers,
        key        : 'voiceover_key',
        plural     : 'voiceovers'
    },
    {
        controller : controllers.shotlists,
        key        : 'shotlist_key',
        plural     : 'shotlists'
    },
    {
        controller : controllers.edits,
        key        : 'edit_key',
        plural     : 'edits'
    },
    {
        controller : controllers.captions,
        key        : 'caption_key',
        plural     : 'captions'
    },
    {
        controller : controllers.masters,
        key        : 'master_key',
        plural     : 'masters'
    }
]

// ROUTES

router.all([
    '/:v/projects/:project_key/:resource',
    '/:v/projects/:project_key/:resource*'
], [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
])

resources.forEach(function(resource) {

    router.get('/:v/projects/:project_key/' + resource.plural, resource.controller.list)
    router.put('/:v/projects/:project_key/' + resource.plural, resource.controller.upsertMany)
    router.get('/:v/projects/:project_key/' + resource.plural + '/:' + resource.key, resource.controller.get)
    router.patch('/:v/projects/:project_key/' + resource.plural + '/:' + resource.key, resource.controller.update)

})

// ---

module.exports = router
