const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    project_mode      : 'local',
    project_mode_list : ['local', 'connected'],
    project_type      : 'game',
    project_type_list : ['game'],
    state             : 'ok',
    state_list        : ['ok', 'gone']
}

const transform = {
    project_key  : {
        lowercase : true,
        trim      : true
    },
    project_name : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id            : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    team_id              : { required : false, index : true,  type : ObjectId, default : null, ref : 'Team' },
    user_id_created      : { required : false, index : true,  type : ObjectId, default : null, ref : 'User' },

    // Project fields
    project_api_root     : { required : false, index : false, type : String,   default : null },
    project_key          : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    project_mode         : { required : true,  index : true,  type : String,   default : defaults.project_mode, enum : defaults.project_mode_list },
    project_name         : { required : true,  index : true,  type : String,   default : null, ...transform.project_name },
    project_name_display : { required : true,  index : false, type : String,   default : null },
    project_prefix       : { required : false, index : true,  type : String,   default : null },
    project_root         : { required : false, index : false, type : String,   default : null },
    project_type         : { required : true,  index : true,  type : String,   default : defaults.project_type, enum : defaults.project_type_list },

    // State
    state                : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                   : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day               : { required : true,  index : false, type : Number,   default : null },
    ts_hour              : { required : true,  index : false, type : Number,   default : null },
    ts_min               : { required : true,  index : false, type : Number,   default : null },
    ts_month             : { required : true,  index : false, type : Number,   default : null },
    ts_updated           : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year              : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Project', schema, 'projects')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Project ... indexes could not be created', err)
    console.log('ok ... Project ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
