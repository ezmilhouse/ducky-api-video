const { model, Schema, Types: { ObjectId } } = require('mongoose')

// ---

const defaults = {
    state      : 'draft',
    state_list : ['draft', 'ok', 'gone']
}

const transform = {
    idea_key    : {
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
    client_id                       : { required : true,  index : true,  type : ObjectId, default : null, ref : 'Client' },
    project_id                      : { required : false, index : true,  type : ObjectId, default : null, ref : 'Project' },

    // Idea fields
    game_id                         : { required : false, index : true,  type : String,   default : null },
    idea_angle                      : { required : false, index : false, type : String,   default : null },
    idea_brief                      : { required : false, index : false, type : String,   default : null },
    idea_duration                   : { required : false, index : false, type : Number,   default : null },
    idea_key                        : { required : true,  index : true,  type : String,   default : null, ...transform.idea_key },
    idea_langs                      : { required : false, index : false, type : Array,    default : [] },
    idea_narrative_hook             : { required : false, index : false, type : String,   default : null },
    idea_narrative_payoff           : { required : false, index : false, type : String,   default : null },
    idea_narrative_thesis           : { required : false, index : false, type : String,   default : null },
    idea_persona_id                 : { required : false, index : true,  type : String,   default : null },
    idea_scene_alternates_beat_1    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_alternates_beat_2    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_alternates_beat_3    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_alternates_hook      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_alternates_payoff    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_alternates_setup     : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_beat_1    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_beat_2    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_beat_3    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_cta       : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_hook      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_payoff    : { required : false, index : false, type : Array,    default : [] },
    idea_scene_candidates_setup     : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_beat_1        : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_beat_2        : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_beat_3        : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_hook          : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_payoff        : { required : false, index : false, type : Array,    default : [] },
    idea_scene_reject_setup         : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_beat_1      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_beat_2      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_beat_3      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_hook        : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_payoff      : { required : false, index : false, type : Array,    default : [] },
    idea_scene_sequence_setup       : { required : false, index : false, type : Array,    default : [] },
    idea_structure_beat_1           : { required : false, index : false, type : String,   default : null },
    idea_structure_beat_2           : { required : false, index : false, type : String,   default : null },
    idea_structure_beat_3           : { required : false, index : false, type : String,   default : null },
    idea_structure_setup            : { required : false, index : false, type : String,   default : null },
    idea_tags                       : { required : false, index : false, type : Array,    default : [] },
    idea_title                      : { required : false, index : true,  type : String,   default : null },
    idea_type                       : { required : false, index : true,  type : String,   default : null },
    idea_visual_intent_beat_1       : { required : false, index : false, type : String,   default : null },
    idea_visual_intent_beat_2       : { required : false, index : false, type : String,   default : null },
    idea_visual_intent_beat_3       : { required : false, index : false, type : String,   default : null },
    idea_visual_intent_hook         : { required : false, index : false, type : String,   default : null },
    idea_visual_intent_payoff       : { required : false, index : false, type : String,   default : null },
    idea_visual_intent_setup        : { required : false, index : false, type : String,   default : null },
    project_cli_id                  : { required : false, index : true,  type : String,   default : null },
    project_key                     : { required : true,  index : true,  type : String,   default : null, ...transform.project_key },

    // State
    state                           : { required : true,  index : true,  type : String,   default : defaults.state, enum : defaults.state_list },

    // Timestamps
    ts                              : { required : true,  index : true,  type : Date,     default : Date.now },
    ts_day                          : { required : true,  index : false, type : Number,   default : null },
    ts_hour                         : { required : true,  index : false, type : Number,   default : null },
    ts_min                          : { required : true,  index : false, type : Number,   default : null },
    ts_month                        : { required : true,  index : false, type : Number,   default : null },
    ts_updated                      : { required : true,  index : false, type : Date,     default : Date.now },
    ts_year                         : { required : true,  index : false, type : Number,   default : null }

})

// ---

const Model = model('Idea', schema, 'ideas')

Model.createIndexes(function(err) {
    if (err) return console.log('failed ... Idea ... indexes could not be created', err)
    console.log('ok ... Idea ... indexes created')
})

module.exports = {
    Model,
    defaults  : defaults  ?? {},
    transform : transform ?? {}
}
