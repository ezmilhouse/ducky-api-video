const workerStep = function(step) {

    return Object.assign({
        step_kind       : 'worker',
        worker_supported: true
    }, step)

}

const manualStep = function(step) {

    return Object.assign({
        required_fields : [],
        step_kind       : 'manual',
        worker_supported: false
    }, step)

}

const unsupportedStep = function(step) {

    return Object.assign({
        required_fields : [],
        step_kind       : 'unsupported',
        worker_supported: false
    }, step)

}

const commonManual = {
    pickIdeas : manualStep({
        flow_step_key: 'pick-ideas',
        instructions : 'Review generated ideas, rate the preferred candidates, and pick the ideas that should continue.',
        job_type     : 'manual.pick-ideas'
    }),
    pickScripts : manualStep({
        flow_step_key: 'pick-scripts',
        instructions : 'Review generated scripts, rate the preferred variants, and pick the scripts that should continue.',
        job_type     : 'manual.pick-scripts'
    }),
    pickShotlists : manualStep({
        flow_step_key: 'pick-shotlists',
        instructions : 'Review generated shotlists, rate the preferred variants, and pick the shotlists that should continue.',
        job_type     : 'manual.pick-shotlists'
    }),
    pickVoiceovers : manualStep({
        flow_step_key: 'pick-voiceovers',
        instructions : 'Review generated voiceovers, rate the preferred variants, and pick the voiceovers that should continue.',
        job_type     : 'manual.pick-voiceovers'
    }),
    reviewMasters : manualStep({
        flow_step_key: 'review-masters',
        instructions : 'Review rendered master files in the master folder. Rename files with @+++, @++, @+, or _ to grade or exclude them.',
        job_type     : 'manual.review-masters'
    }),
    reviewScenes : manualStep({
        flow_step_key: 'review-scenes',
        instructions : 'Review scenes in the project scenes folder. Rename files with @+++, @++, @+, trim markers such as @ts2000 or @te500, or _ to exclude.',
        job_type     : 'manual.review-scenes'
    })
}

const steps = {
    captionRecord : workerStep({
        flow_step_key: 'caption-record',
        job_command  : 'ducky caption record',
        job_type     : 'caption.record',
        required_fields: []
    }),
    downloadYoutube : workerStep({
        flow_step_key  : 'download-youtube',
        job_command    : 'ducky download -yt',
        job_type       : 'download.youtube',
        required_fields: ['youtube_url']
    }),
    editMaster : workerStep({
        flow_step_key: 'edit-master',
        job_command  : 'ducky edit master',
        job_type     : 'edit.master',
        required_fields: []
    }),
    editRender : workerStep({
        flow_step_key  : 'edit-render',
        job_command    : 'ducky edit render',
        job_type       : 'edit.render',
        required_fields: ['layout']
    }),
    gameCreate : workerStep({
        flow_step_key  : 'game-create',
        job_command    : 'ducky game create',
        job_type       : 'game.create',
        required_fields: ['name']
    }),
    gameCreateSteam : workerStep({
        flow_step_key  : 'game-create',
        job_command    : 'ducky game create',
        job_type       : 'game.create',
        required_fields: ['name', 'steam_app_id']
    }),
    gameDownload : unsupportedStep({
        flow_step_key: 'game-download',
        job_command  : 'ducky game download',
        job_type     : 'game.download'
    }),
    gameResearch : workerStep({
        flow_step_key: 'game-research',
        job_command  : 'ducky game research',
        job_type     : 'game.research',
        required_fields: []
    }),
    ideaCreate : workerStep({
        flow_step_key  : 'idea-create',
        job_command    : 'ducky idea create',
        job_type       : 'idea.create',
        required_fields: ['brief']
    }),
    masterExport : workerStep({
        flow_step_key  : 'master-export',
        job_command    : 'ducky master export',
        job_type       : 'master.export',
        required_fields: ['export_name']
    }),
    masterIndex : workerStep({
        flow_step_key: 'master-index',
        job_command  : 'ducky master index',
        job_type     : 'master.index',
        required_fields: []
    }),
    masterSummary : workerStep({
        flow_step_key  : 'master-summary',
        job_command    : 'ducky master summary',
        job_type       : 'master.summary',
        required_fields: ['headline', 'export_name']
    }),
    scenesClip : workerStep({
        flow_step_key: 'scenes-clip',
        job_command  : 'ducky scenes clip',
        job_type     : 'scenes.clip',
        required_fields: []
    }),
    scenesEnrich : workerStep({
        flow_step_key: 'scenes-enrich',
        job_command  : 'ducky scenes enrich',
        job_type     : 'scenes.enrich',
        required_fields: []
    }),
    scenesIndex : workerStep({
        flow_step_key: 'scenes-index',
        job_command  : 'ducky scenes index',
        job_type     : 'scenes.index',
        required_fields: []
    }),
    scriptCreate : workerStep({
        flow_step_key: 'script-create',
        job_command  : 'ducky script create',
        job_type     : 'script.create',
        required_fields: []
    }),
    shotlistCreate : workerStep({
        flow_step_key: 'shotlist-create',
        job_command  : 'ducky shotlist create',
        job_type     : 'shotlist.create',
        required_fields: []
    }),
    sourceRepair : workerStep({
        flow_step_key: 'source-repair',
        job_command  : 'ducky source --repair',
        job_type     : 'source.repair',
        required_fields: []
    }),
    syncPushGames : workerStep({
        flow_step_key: 'sync-push-games',
        job_command  : 'ducky sync push',
        job_payload  : {
            resource : 'games'
        },
        job_type       : 'sync.push',
        required_fields: []
    }),
    voiceoverCreate : workerStep({
        flow_step_key  : 'voiceover-create',
        job_command    : 'ducky voiceover create',
        job_type       : 'voiceover.create',
        required_fields: ['vo_actor', 'vo_tone']
    })
}

const fullGameProductionSteps = [
    steps.scenesClip,
    commonManual.reviewScenes,
    steps.scenesIndex,
    steps.scenesEnrich,
    steps.ideaCreate,
    commonManual.pickIdeas,
    steps.scriptCreate,
    commonManual.pickScripts,
    steps.voiceoverCreate,
    commonManual.pickVoiceovers,
    steps.shotlistCreate,
    commonManual.pickShotlists,
    steps.editRender,
    steps.captionRecord,
    steps.editMaster,
    commonManual.reviewMasters,
    steps.masterIndex,
    steps.masterExport,
    steps.masterSummary
]

const flows = [
    {
        content_profile : 'steam-game',
        description     : 'Minimal game flow for Steam-backed projects.',
        flow_key        : 'game-steam-minimal',
        flow_name       : 'Game Steam Minimal',
        project_type    : 'game',
        prompt_profile  : 'default',
        steps           : [
            steps.gameCreateSteam,
            steps.syncPushGames
        ]
    },
    {
        content_profile : 'steam-game',
        description     : 'Minimal Steam-backed game flow with a manual scene review checkpoint.',
        flow_key        : 'game-steam-review-minimal',
        flow_name       : 'Game Steam Review Minimal',
        project_type    : 'game',
        prompt_profile  : 'default',
        steps           : [
            steps.gameCreateSteam,
            commonManual.reviewScenes,
            steps.syncPushGames
        ]
    },
    {
        content_profile : 'game',
        description     : 'Minimal game flow for non-Steam source material.',
        flow_key        : 'game-vanilla-minimal',
        flow_name       : 'Game Vanilla Minimal',
        project_type    : 'game',
        prompt_profile  : 'default',
        steps           : [
            steps.gameCreate,
            steps.sourceRepair,
            steps.scenesIndex
        ]
    },
    {
        content_profile : 'clipping',
        description     : 'Minimal clipping flow for existing long-form source material.',
        flow_key        : 'clipping-basic',
        flow_name       : 'Clipping Basic',
        project_type    : 'clipping',
        prompt_profile  : 'default',
        steps           : [
            steps.sourceRepair,
            steps.scenesIndex
        ]
    },
    {
        content_profile : 'steam-game',
        description     : 'Full Steam-backed game short production flow. Unsupported steps are visible but pause until worker support is added.',
        flow_key        : 'game-steam-full-v1',
        flow_name       : 'Game Steam Full V1',
        project_type    : 'game',
        prompt_profile  : 'default',
        steps           : [
            steps.gameCreateSteam,
            steps.gameResearch,
            steps.gameDownload,
            ...fullGameProductionSteps
        ]
    },
    {
        content_profile : 'game',
        description     : 'Full game short production flow for YouTube or manually supplied source material.',
        flow_key        : 'game-youtube-full-v1',
        flow_name       : 'Game YouTube Full V1',
        project_type    : 'game',
        prompt_profile  : 'default',
        steps           : [
            steps.gameCreate,
            steps.downloadYoutube,
            steps.sourceRepair,
            ...fullGameProductionSteps
        ]
    },
    {
        content_profile : 'clipping',
        description     : 'Basic long-form source clipping flow. Unsupported render/export steps are visible but pause until worker support is added.',
        flow_key        : 'clipping-basic-v1',
        flow_name       : 'Clipping Basic V1',
        project_type    : 'clipping',
        prompt_profile  : 'default',
        steps           : [
            steps.downloadYoutube,
            steps.sourceRepair,
            steps.scenesClip,
            commonManual.reviewScenes,
            steps.scenesIndex,
            steps.editRender,
            commonManual.reviewMasters,
            steps.masterIndex,
            steps.masterExport
        ]
    }
]

const byKey = {}

flows.forEach(function(flow) {
    byKey[flow.flow_key] = flow
})

module.exports = {
    byKey,
    flows
}
