const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'pending',
    state_list : ['pending', 'sent', 'accepted', 'gone']
}

const transform = {
    team_invite_email : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id          : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    team_id            : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Team' },
    user_id_created    : { required : true,  index : true,  type : ObjectId, default : null, ref : 'User' },

    // Invite fields
    team_invite_email  : { required : true,  index : true,  type : String,   default : null, ...transform.team_invite_email },
    team_invite_token  : { required : true,  index : true,  type : String,   default : null },

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

const Model = model('TeamInvite', schema, 'team_invites')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... TeamInvite ... indexes could not be created', err)
    console.log('ok ... TeamInvite ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
