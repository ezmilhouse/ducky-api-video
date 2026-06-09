const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'ok',
    state_list : ['ok', 'gone']
}

const transform = {
    team_name : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id        : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    user_id_created  : { required : true,  index : true,  type : ObjectId, default : null, ref : 'User' },

    // Team fields
    team_name         : { required : true,  index : true,  type : String,   default : null, ...transform.team_name },
    team_name_display : { required : true,  index : false, type : String,   default : null },

    // State
    state            : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts               : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day           : { required : true,  index : false, type : Number,   default : null },
    ts_hour          : { required : true,  index : false, type : Number,   default : null },
    ts_min           : { required : true,  index : false, type : Number,   default : null },
    ts_month         : { required : true,  index : false, type : Number,   default : null },
    ts_updated       : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year          : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Team', schema, 'teams')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Team ... indexes could not be created', err)
    console.log('ok ... Team ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
