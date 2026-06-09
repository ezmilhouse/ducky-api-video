const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    game_role      : 'main',
    game_role_list : ['main', 'sub', 'context-main', 'context-sub'],
    state          : 'ok',
    state_list     : ['ok', 'gone']
}

const transform = {
    game_key    : {
        lowercase : true,
        trim      : true
    },
    game_name   : {
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

    // Game fields
    game_assets       : { required : false, index : false, type : Array,    default : [] },
    game_id_parent    : { required : false, index : true,  type : String,   default : null },
    game_id_steam     : { required : false, index : true,  type : String,   default : null },
    game_key          : { required : true,  index : true,  type : String,   default : null, ...transform.game_key },
    game_name         : { required : false, index : true,  type : String,   default : null, ...transform.game_name },
    game_name_display : { required : false, index : false, type : String,   default : null },
    game_research     : { required : false, index : false, type : Object,   default : {} },
    game_role         : { required : true,  index : true,  type : String,   default : defaults.game_role, enum : defaults.game_role_list },
    game_url_store    : { required : false, index : false, type : String,   default : null },
    project_cli_id    : { required : false, index : true,  type : String,   default : null },
    project_key       : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },

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

const Model = model('Game', schema, 'games')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Game ... indexes could not be created', err)
    console.log('ok ... Game ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
