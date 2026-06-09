const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    source_type      : 'video',
    source_type_list : ['video', 'audio', 'image', 'other'],
    state            : 'ok',
    state_list       : ['ok', 'registered', 'deleted', 'gone']
}

const transform = {
    project_key : {
        lowercase : true,
        trim      : true
    },
    source_key  : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id       : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id      : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Source fields
    project_cli_id  : { required : false, index : true,  type : String,   default : null },
    project_key     : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    source_duration : { required : false, index : false, type : Number,   default : null },
    source_file     : { required : false, index : true,  type : String,   default : null },
    source_key      : { required : true,  index : true,  type : String,   default : null, ...transform.source_key },
    source_size     : { required : false, index : false, type : Number,   default : null },
    source_type     : { required : true,  index : true,  type : String,   default : defaults.source_type, enum : defaults.source_type_list },

    // State
    state           : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts              : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day          : { required : true,  index : false, type : Number,   default : null },
    ts_hour         : { required : true,  index : false, type : Number,   default : null },
    ts_min          : { required : true,  index : false, type : Number,   default : null },
    ts_month        : { required : true,  index : false, type : Number,   default : null },
    ts_updated      : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year         : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Source', schema, 'sources')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Source ... indexes could not be created', err)
    console.log('ok ... Source ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
