const app    = require(__app).app
const flow   = require('async')
const router = require('express').Router()

const controllers = require(__regdir + '/controllers')

// CONTROLLERS

const clients = controllers.clients

const resources = [
    { plural : 'games' },
    { plural : 'sources' },
    { plural : 'scenes' },
    { plural : 'ideas' },
    { plural : 'scripts' },
    { plural : 'voiceovers' },
    { plural : 'shotlists' },
    { plural : 'edits' },
    { plural : 'captions' },
    { plural : 'masters' }
]

// HELPERS

const getClientId = function(req) {

    if (!req.globals || !req.globals.data || !req.globals.data.client) return null

    return req.globals.data.client._id || null

}

const keyBy = function(items, key) {

    return (items || []).reduce(function(map, item) {
        if (item && item[key]) map[item[key]] = item
        return map
    }, {})

}

const countBy = function(items, key, filter) {

    return (items || []).reduce(function(map, item) {
        if (!item || !item[key]) return map
        if (filter && !filter(item)) return map
        map[item[key]] = (map[item[key]] || 0) + 1
        return map
    }, {})

}

const pick = function(item, keys) {

    const result = {}

    keys.forEach(function(key) {
        if (typeof item[key] !== 'undefined') result[key] = item[key]
    })

    return result

}

const buildOverview = function(data) {

    const scripts_by_idea       = countBy(data.scripts, 'idea_id')
    const scripts_ok_by_idea    = countBy(data.scripts, 'idea_id', item => item.state === 'ok')
    const voiceovers_by_idea    = countBy(data.voiceovers, 'idea_id')
    const voiceovers_ok_by_idea = countBy(data.voiceovers, 'idea_id', item => item.state === 'ok')
    const shotlists_by_idea     = countBy(data.shotlists, 'idea_id')
    const shotlists_ok_by_idea  = countBy(data.shotlists, 'idea_id', item => item.state === 'ok')
    const masters_by_edit       = countBy(data.masters, 'edit_id', item => item.state !== 'gone')

    const ideas_by_key     = keyBy(data.ideas, 'idea_key')
    const scripts_by_key   = keyBy(data.scripts, 'script_key')
    const voiceovers_by_key = keyBy(data.voiceovers, 'voiceover_key')
    const shotlists_by_key = keyBy(data.shotlists, 'shotlist_key')

    return {
        edits : (data.edits || []).map(function(edit) {
            return {
                ...pick(edit, [
                    'edit_key',
                    'idea_id',
                    'script_id',
                    'shotlist_id',
                    'voiceover_id',
                    'edit_duration',
                    'edit_file',
                    'edit_layout',
                    'state'
                ]),
                master_count : masters_by_edit[edit.edit_key] || 0
            }
        }),
        ideas : (data.ideas || []).map(function(idea) {
            return {
                ...pick(idea, [
                    'idea_key',
                    'game_id',
                    'idea_duration',
                    'idea_rating',
                    'idea_rating_note',
                    'idea_title',
                    'idea_type',
                    'state'
                ]),
                script_count       : scripts_by_idea[idea.idea_key] || 0,
                script_ok_count    : scripts_ok_by_idea[idea.idea_key] || 0,
                shotlist_count     : shotlists_by_idea[idea.idea_key] || 0,
                shotlist_ok_count  : shotlists_ok_by_idea[idea.idea_key] || 0,
                voiceover_count    : voiceovers_by_idea[idea.idea_key] || 0,
                voiceover_ok_count : voiceovers_ok_by_idea[idea.idea_key] || 0
            }
        }),
        masters : (data.masters || []).map(function(master) {
            return pick(master, [
                'master_key',
                'edit_id',
                'idea_id',
                'script_id',
                'shotlist_id',
                'voiceover_id',
                'master_duration',
                'master_file',
                'master_files',
                'master_grade_human',
                'master_layout',
                'master_title',
                'state'
            ])
        }),
        scripts : (data.scripts || []).map(function(script) {
            const idea = ideas_by_key[script.idea_id] || {}
            return {
                ...pick(script, [
                    'script_key',
                    'idea_id',
                    'script_duration',
                    'script_langs',
                    'script_rating',
                    'script_rating_note',
                    'script_title',
                    'script_word_count',
                    'state'
                ]),
                idea_rating : idea.idea_rating || null,
                idea_title  : idea.idea_title || null
            }
        }),
        shotlists : (data.shotlists || []).map(function(shotlist) {
            const idea       = ideas_by_key[shotlist.idea_id] || {}
            const script     = scripts_by_key[shotlist.script_id] || {}
            const voiceover  = voiceovers_by_key[shotlist.voiceover_id] || {}
            const shot_count = (shotlist.shotlist_shots || []).length
            return {
                ...pick(shotlist, [
                    'shotlist_key',
                    'idea_id',
                    'script_id',
                    'voiceover_id',
                    'shotlist_name',
                    'shotlist_name_display',
                    'shotlist_rating',
                    'shotlist_rating_note',
                    'shotlist_target_duration',
                    'state'
                ]),
                idea_rating     : idea.idea_rating || null,
                idea_title      : idea.idea_title || null,
                script_title    : script.script_title || null,
                shot_count      : shot_count,
                voiceover_file  : voiceover.voiceover_file || null,
                voiceover_state : voiceover.state || null
            }
        }),
        voiceovers : (data.voiceovers || []).map(function(voiceover) {
            const idea   = ideas_by_key[voiceover.idea_id] || {}
            const script = scripts_by_key[voiceover.script_id] || {}
            return {
                ...pick(voiceover, [
                    'voiceover_key',
                    'idea_id',
                    'script_id',
                    'voiceover_duration',
                    'voiceover_file',
                    'voiceover_lang',
                    'voiceover_tone',
                    'voiceover_voice',
                    'state'
                ]),
                idea_title   : idea.idea_title || null,
                script_title : script.script_title || null,
                word_count   : (voiceover.voiceover_words || []).length
            }
        })
    }

}

const buildJobOverview = function(jobs) {

    return (jobs || []).map(function(job) {
        return pick(job, [
            '_id',
            'flow_run_key',
            'flow_step_index',
            'flow_step_key',
            'job_command',
            'job_metrics',
            'job_progress_current',
            'job_progress_label',
            'job_progress_step',
            'job_progress_total',
            'job_source',
            'job_type',
            'state',
            'ts',
            'ts_updated'
        ])
    })

}

// ROUTES

router.all('/:v/projects/:project_key/browse', [
    clients.limits.verify,
    clients.keys.verify,
    clients.signatures.verify
])

router.get('/:v/projects/:project_key/browse', function(req, res) {

    const results = {
        client_id : getClientId(req),
        data      : {},
        project_key : req.params.project_key
    }

    flow.waterfall([
        function(cb) {
            flow.eachSeries(resources, function(resource, next) {
                app.emit('service:' + resource.plural + ':get', {
                    limit : 1000,
                    query : {
                        client_id   : results.client_id,
                        project_key : results.project_key,
                        state       : {
                            $ne : 'gone'
                        }
                    }
                }, function(err, data) {
                    if (err) return next(err)
                    results.data[resource.plural] = data[resource.plural] || []
                    next()
                })
            }, cb)
        },
        function(cb) {
            app.emit('service:jobs:get', {
                limit : 20,
                query : {
                    client_id   : results.client_id,
                    project_key : results.project_key,
                    state       : {
                        $in : ['pending', 'running', 'paused', 'error']
                    }
                },
                sort : {
                    ts_updated : -1
                }
            }, function(err, data) {
                if (err) return cb(err)
                results.data.jobs = data.jobs || []
                cb()
            })
        }
    ], function(err) {
        if (err) return res.status(err.status || 400).json(err)

        const counts = {}

        resources.forEach(function(resource) {
            counts[resource.plural] = (results.data[resource.plural] || []).length
        })

        res.status(200).json({
            counts      : counts,
            jobs        : buildJobOverview(results.data.jobs),
            latest_job  : buildJobOverview(results.data.jobs)[0] || null,
            overview    : buildOverview(results.data),
            project_key : results.project_key,
            resources   : results.data
        })
    })

})

// ---

module.exports = router
