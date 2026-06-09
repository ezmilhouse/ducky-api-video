const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'draft',
    state_list : ['draft', 'ok', 'error', 'gone']
}

const transform = {
    project_key  : {
        lowercase : true,
        trim      : true
    },
    shotlist_key : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id                    : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id                   : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Shotlist fields
    game_id                      : { required : false, index : true,  type : String,   default : null },
    game_id_steam                : { required : false, index : true,  type : String,   default : null },
    idea_id                      : { required : false, index : true,  type : String,   default : null },
    project_cli_id               : { required : false, index : true,  type : String,   default : null },
    project_key                  : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    script_id                    : { required : false, index : true,  type : String,   default : null },
    shotlist_hook_justification  : { required : false, index : false, type : String,   default : null },
    shotlist_key                 : { required : true,  index : true,  type : String,   default : null, ...transform.shotlist_key },
    shotlist_name                : { required : false, index : true,  type : String,   default : null },
    shotlist_name_display        : { required : false, index : false, type : String,   default : null },
    shotlist_sections_used       : { required : false, index : false, type : Array,    default : [] },
    shotlist_shots               : { required : false, index : false, type : Array,    default : [] },
    shotlist_silent_intro        : { required : false, index : false, type : Number,   default : null },
    shotlist_silent_outro        : { required : false, index : false, type : Number,   default : null },
    shotlist_summary             : { required : false, index : false, type : String,   default : null },
    shotlist_target_duration     : { required : false, index : false, type : Number,   default : null },
    shotlist_voiceover_verbatim  : { required : false, index : false, type : String,   default : null },
    voiceover_id                 : { required : false, index : true,  type : String,   default : null },

    // State
    state                        : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                           : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day                       : { required : true,  index : false, type : Number,   default : null },
    ts_hour                      : { required : true,  index : false, type : Number,   default : null },
    ts_min                       : { required : true,  index : false, type : Number,   default : null },
    ts_month                     : { required : true,  index : false, type : Number,   default : null },
    ts_updated                   : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year                      : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Shotlist', schema, 'shotlists')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Shotlist ... indexes could not be created', err)
    console.log('ok ... Shotlist ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
