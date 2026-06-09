const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'ok',
    state_list : ['ok', 'recorded', 'gone']
}

const transform = {
    caption_key : {
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
    client_id       : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id      : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Caption fields
    caption_file              : { required : false, index : true,  type : String,   default : null },
    caption_file_edit         : { required : false, index : false, type : String,   default : null },
    caption_file_output       : { required : false, index : true,  type : String,   default : null },
    caption_file_overlay      : { required : false, index : true,  type : String,   default : null },
    caption_fps               : { required : false, index : false, type : Number,   default : null },
    caption_frame_h           : { required : false, index : false, type : Number,   default : null },
    caption_frame_w           : { required : false, index : false, type : Number,   default : null },
    caption_key               : { required : true,  index : true,  type : String,   default : null, ...transform.caption_key },
    caption_layout            : { required : false, index : true,  type : String,   default : null },
    caption_postfix           : { required : false, index : false, type : String,   default : null },
    caption_renderer          : { required : false, index : true,  type : String,   default : null },
    caption_renderer_declared : { required : false, index : false, type : String,   default : null },
    caption_renderer_reason   : { required : false, index : false, type : String,   default : null },
    caption_renderer_requested: { required : false, index : false, type : String,   default : null },
    caption_seconds_composite : { required : false, index : false, type : Number,   default : null },
    caption_seconds_record    : { required : false, index : false, type : Number,   default : null },
    caption_seconds_total     : { required : false, index : false, type : Number,   default : null },
    caption_size_output       : { required : false, index : false, type : Number,   default : null },
    caption_size_overlay      : { required : false, index : false, type : Number,   default : null },
    caption_style             : { required : false, index : true,  type : String,   default : null },
    edit_id                   : { required : false, index : true,  type : String,   default : null },
    project_cli_id            : { required : false, index : true,  type : String,   default : null },
    project_key               : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    shotlist_id               : { required : false, index : true,  type : String,   default : null },
    voiceover_id              : { required : false, index : true,  type : String,   default : null },

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

const Model = model('Caption', schema, 'captions')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Caption ... indexes could not be created', err)
    console.log('ok ... Caption ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
