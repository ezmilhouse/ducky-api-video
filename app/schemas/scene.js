const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'pending',
    state_list : ['pending', 'described', 'ok', 'gone']
}

const transform = {
    project_key : {
        lowercase : true,
        trim      : true
    },
    scene_key   : {
        lowercase : true,
        trim      : true
    }
}

const schema = new Schema({

    // IDs
    client_id                 : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id                : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Scene fields
    game_id                   : { required : false, index : true,  type : String,   default : null },
    project_cli_id            : { required : false, index : true,  type : String,   default : null },
    project_key               : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },
    scene_anchor_points       : { required : false, index : false, type : Array,    default : [] },
    scene_bridge              : { required : false, index : false, type : Boolean,  default : false },
    scene_clip                : { required : false, index : true,  type : String,   default : null },
    scene_dead_zones_detected : { required : false, index : false, type : Array,    default : [] },
    scene_describe            : { required : false, index : false, type : String,   default : null },
    scene_describe_method     : { required : false, index : false, type : String,   default : null },
    scene_describe_multi      : { required : false, index : false, type : String,   default : null },
    scene_duration            : { required : false, index : false, type : Number,   default : null },
    scene_editorial_note      : { required : false, index : false, type : String,   default : null },
    scene_end                 : { required : false, index : false, type : Number,   default : null },
    scene_fps                 : { required : false, index : false, type : Number,   default : null },
    scene_frames              : { required : false, index : false, type : Array,    default : [] },
    scene_grade               : { required : false, index : true,  type : String,   default : null },
    scene_grade_multi         : { required : false, index : true,  type : String,   default : null },
    scene_highlight_timecode  : { required : false, index : false, type : String,   default : null },
    scene_human_grade         : { required : false, index : true,  type : String,   default : null },
    scene_human_prefix        : { required : false, index : false, type : String,   default : null },
    scene_key                 : { required : true,  index : true,  type : String,   default : null, ...transform.scene_key },
    scene_move_l              : { required : false, index : false, type : Number,   default : null },
    scene_move_r              : { required : false, index : false, type : Number,   default : null },
    scene_needs_work          : { required : false, index : true,  type : Boolean,  default : null },
    scene_ref_end             : { required : false, index : false, type : Number,   default : null },
    scene_ref_start           : { required : false, index : false, type : Number,   default : null },
    scene_source              : { required : false, index : true,  type : String,   default : null },
    scene_start               : { required : false, index : false, type : Number,   default : null },
    scene_tags                : { required : false, index : false, type : Array,    default : [] },
    scene_timecode_in         : { required : false, index : false, type : String,   default : null },
    scene_timecode_out        : { required : false, index : false, type : String,   default : null },
    scene_trim_end_ms         : { required : false, index : false, type : Number,   default : null },
    scene_trim_start_ms       : { required : false, index : false, type : Number,   default : null },
    source_id                 : { required : false, index : true,  type : String,   default : null },

    // State
    state                     : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                        : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day                    : { required : true,  index : false, type : Number,   default : null },
    ts_hour                   : { required : true,  index : false, type : Number,   default : null },
    ts_min                    : { required : true,  index : false, type : Number,   default : null },
    ts_month                  : { required : true,  index : false, type : Number,   default : null },
    ts_updated                : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year                   : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Scene', schema, 'scenes')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Scene ... indexes could not be created', err)
    console.log('ok ... Scene ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
