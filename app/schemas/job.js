const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    job_source      : 'cli',
    job_source_list : ['api', 'cli', 'worker'],
    state           : 'pending',
    state_list      : ['pending', 'running', 'paused', 'ok', 'error', 'cancelled', 'gone']
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
    flow_step_key : {
        lowercase : true,
        trim      : true
    },
    job_command : {
        trim : true
    },
    job_type : {
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

    // Flow fields
    content_profile : { required : false, index : true,  type : String,   default : null },
    flow_key        : { required : false, index : true,  type : String,   default : null, ...transform.flow_key },
    flow_run_key    : { required : false, index : true,  type : String,   default : null, ...transform.flow_run_key },
    flow_step_index : { required : false, index : true,  type : Number,   default : null },
    flow_step_key   : { required : false, index : true,  type : String,   default : null, ...transform.flow_step_key },
    prompt_profile  : { required : false, index : true,  type : String,   default : null },

    // Job fields
    job_args       : { required : false, index : false, type : Object,   default : {} },
    job_claimed_by : { required : false, index : true,  type : String,   default : null },
    job_command    : { required : true,  index : true,  type : String,   default : null, ...transform.job_command },
    job_exit_code  : { required : false, index : true,  type : Number,   default : null },
    job_finished   : { required : false, index : true,  type : Date,     default : null },
    job_log_stderr : { required : false, index : false, type : String,   default : null },
    job_log_stdout : { required : false, index : false, type : String,   default : null },
    job_payload    : { required : false, index : false, type : Object,   default : {} },
    job_metrics    : { required : false, index : false, type : Object,   default : {} },
    job_progress_current : { required : false, index : false, type : Number, default : null },
    job_progress_label   : { required : false, index : false, type : String, default : null },
    job_progress_step    : { required : false, index : true,  type : String, default : null },
    job_progress_total   : { required : false, index : false, type : Number, default : null },
    job_source     : { required : true,  index : true,  type : String,   default : defaults.job_source, enum : defaults.job_source_list },
    job_started    : { required : false, index : true,  type : Date,     default : null },
    job_type       : { required : false, index : true,  type : String,   default : null, ...transform.job_type },
    job_worker_id  : { required : false, index : true,  type : String,   default : null },
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

const Model = model('Job', schema, 'jobs')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Job ... indexes could not be created', err)
    console.log('ok ... Job ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
