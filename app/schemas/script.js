const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'draft',
    state_list : ['draft', 'ok', 'gone']
}

const transform = {
    project_key : {
        lowercase : true,
        trim      : true
    },
    script_key  : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id                  : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id                 : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Script fields
    game_id                    : { required : false, index : true,  type : String,   default : null },
    idea_id                    : { required : false, index : true,  type : String,   default : null },
    persona_id                 : { required : false, index : true,  type : String,   default : null },
    project_cli_id             : { required : false, index : true,  type : String,   default : null },
    project_key                : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    script_duration            : { required : false, index : false, type : Number,   default : null },
    script_key                 : { required : true,  index : true,  type : String,   default : null, ...transform.script_key },
    script_langs               : { required : false, index : false, type : Array,    default : [] },
    script_rating              : { required : false, index : true,  type : Number,   default : null },
    script_rating_note         : { required : false, index : false, type : String,   default : null },
    script_sections            : { required : false, index : false, type : Array,    default : [] },
    script_silent_intro        : { required : false, index : false, type : Number,   default : null },
    script_silent_outro        : { required : false, index : false, type : Number,   default : null },
    script_source_beat_1       : { required : false, index : false, type : String,   default : null },
    script_source_beat_2       : { required : false, index : false, type : String,   default : null },
    script_source_beat_3       : { required : false, index : false, type : String,   default : null },
    script_source_cta          : { required : false, index : false, type : String,   default : null },
    script_source_hook         : { required : false, index : false, type : String,   default : null },
    script_source_payoff       : { required : false, index : false, type : String,   default : null },
    script_source_setup        : { required : false, index : false, type : String,   default : null },
    script_source_thesis       : { required : false, index : false, type : String,   default : null },
    script_title               : { required : false, index : true,  type : String,   default : null },
    script_tone                : { required : false, index : true,  type : String,   default : null },
    script_voice               : { required : false, index : true,  type : String,   default : null },
    script_voiceover           : { required : false, index : false, type : String,   default : null },
    script_voiceover_lines     : { required : false, index : false, type : Array,    default : [] },
    script_word_count          : { required : false, index : false, type : Number,   default : null },

    // State
    state                      : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                         : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day                     : { required : true,  index : false, type : Number,   default : null },
    ts_hour                    : { required : true,  index : false, type : Number,   default : null },
    ts_min                     : { required : true,  index : false, type : Number,   default : null },
    ts_month                   : { required : true,  index : false, type : Number,   default : null },
    ts_updated                 : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year                    : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Script', schema, 'scripts')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Script ... indexes could not be created', err)
    console.log('ok ... Script ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
