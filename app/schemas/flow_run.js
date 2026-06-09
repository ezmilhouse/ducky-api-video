const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'pending',
    state_list : ['pending', 'running', 'paused', 'ok', 'error', 'cancelled', 'gone']
}

const transform = {
    flow_key : {
        lowercase : true,
        trim      : true
    },
    flow_run_key : {
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

    // Flow fields
    content_profile    : { required : false, index : true,  type : String,   default : null },
    current_step_index : { required : false, index : true,  type : Number,   default : null },
    flow_key           : { required : true,  index : true,  type : String,   default : null, ...transform.flow_key },
    flow_name          : { required : false, index : false, type : String,   default : null },
    flow_run_key       : { required : true,  index : true,  type : String,   default : null, ...transform.flow_run_key },
    flow_steps         : { required : false, index : false, type : Array,    default : [] },
    project_key        : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    project_type       : { required : false, index : true,  type : String,   default : null },
    prompt_profile     : { required : false, index : true,  type : String,   default : null },

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

const Model = model('FlowRun', schema, 'flow_runs')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... FlowRun ... indexes could not be created', err)
    console.log('ok ... FlowRun ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
