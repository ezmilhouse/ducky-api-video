const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    asset_kind         : 'source',
    asset_kind_list    : ['source', 'scene', 'voiceover', 'edit', 'caption', 'master', 'game', 'other'],
    asset_storage      : 'local',
    asset_storage_list : ['local', 's3', 'r2', 'b2', 'minio'],
    state              : 'ok',
    state_list         : ['ok', 'gone']
}

const transform = {
    asset_key   : {
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
    client_id      : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id     : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Asset fields
    asset_bytes    : { required : false, index : false, type : Number,   default : null },
    asset_key      : { required : true,  index : true,  type : String,   default : null, ...transform.asset_key },
    asset_kind     : { required : true,  index : true,  type : String,   default : defaults.asset_kind, enum : defaults.asset_kind_list },
    asset_mime     : { required : false, index : false, type : String,   default : null },
    asset_path     : { required : true,  index : false, type : String,   default : null },
    asset_storage  : { required : true,  index : true,  type : String,   default : defaults.asset_storage, enum : defaults.asset_storage_list },
    asset_url      : { required : false, index : false, type : String,   default : null },
    project_key    : { required : false, index : true,  type : String,   default : null, ...transform.project_key },

    // State
    state          : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts             : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day         : { required : true,  index : false, type : Number,   default : null },
    ts_hour        : { required : true,  index : false, type : Number,   default : null },
    ts_min         : { required : true,  index : false, type : Number,   default : null },
    ts_month       : { required : true,  index : false, type : Number,   default : null },
    ts_updated     : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year        : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Asset', schema, 'assets')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Asset ... indexes could not be created', err)
    console.log('ok ... Asset ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
