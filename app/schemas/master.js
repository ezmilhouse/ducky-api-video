const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'indexed',
    state_list : ['indexed', 'ok', 'gone']
}

const transform = {
    master_key  : {
        lowercase : true,
        trim      : true
    },
    project_key : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id          : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id         : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Master fields
    edit_id            : { required : false, index : true,  type : String,   default : null },
    idea_id            : { required : false, index : true,  type : String,   default : null },
    master_duration    : { required : false, index : false, type : Number,   default : null },
    master_file        : { required : false, index : true,  type : String,   default : null },
    master_files       : { required : false, index : false, type : Array,    default : [] },
    master_grade_human : { required : false, index : true,  type : String,   default : null },
    master_key         : { required : true,  index : true,  type : String,   default : null, ...transform.master_key },
    master_layout      : { required : false, index : true,  type : String,   default : null },
    master_origin      : { required : false, index : false, type : String,   default : null },
    master_title       : { required : false, index : true,  type : String,   default : null },
    master_tone        : { required : false, index : true,  type : String,   default : null },
    master_voice       : { required : false, index : true,  type : String,   default : null },
    project_cli_id     : { required : false, index : true,  type : String,   default : null },
    project_key        : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    script_id          : { required : false, index : true,  type : String,   default : null },
    shotlist_id        : { required : false, index : true,  type : String,   default : null },
    voiceover_id       : { required : false, index : true,  type : String,   default : null },

    // State
    state              : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                 : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day             : { required : true,  index : false, type : Number,   default : null },
    ts_hour            : { required : true,  index : false, type : Number,   default : null },
    ts_min             : { required : true,  index : false, type : Number,   default : null },
    ts_month           : { required : true,  index : false, type : Number,   default : null },
    ts_updated         : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year            : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Master', schema, 'masters')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Master ... indexes could not be created', err)
    console.log('ok ... Master ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
