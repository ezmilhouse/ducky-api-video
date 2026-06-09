const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'draft',
    state_list : ['draft', 'ok', 'master', 'gone']
}

const transform = {
    edit_key    : {
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
    client_id         : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id        : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Edit fields
    edit_duration     : { required : false, index : false, type : Number,   default : null },
    edit_file         : { required : false, index : true,  type : String,   default : null },
    edit_key          : { required : true,  index : true,  type : String,   default : null, ...transform.edit_key },
    edit_layout       : { required : false, index : true,  type : String,   default : null },
    edit_meta         : { required : false, index : false, type : String,   default : null },
    edit_postfix      : { required : false, index : false, type : String,   default : null },
    edit_split_gap    : { required : false, index : false, type : Number,   default : null },
    edit_split_weight : { required : false, index : false, type : Number,   default : null },
    idea_id           : { required : false, index : true,  type : String,   default : null },
    project_cli_id    : { required : false, index : true,  type : String,   default : null },
    project_key       : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    script_id         : { required : false, index : true,  type : String,   default : null },
    shotlist_id       : { required : false, index : true,  type : String,   default : null },
    voiceover_id      : { required : false, index : true,  type : String,   default : null },

    // State
    state             : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day            : { required : true,  index : false, type : Number,   default : null },
    ts_hour           : { required : true,  index : false, type : Number,   default : null },
    ts_min            : { required : true,  index : false, type : Number,   default : null },
    ts_month          : { required : true,  index : false, type : Number,   default : null },
    ts_updated        : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year           : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Edit', schema, 'edits')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Edit ... indexes could not be created', err)
    console.log('ok ... Edit ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
