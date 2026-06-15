module.exports = [
    require(__sevdir + '/globals/controller').createGlobals,
    require(__sevdir + '/globals/controller').createGlobalsData,
    require('../services_endpoints/flows'),
    require('../services_endpoints/jobs'),
    require('../services_endpoints/project_browse'),
    require('../services_endpoints/project_resources'),
    require('../services_endpoints/projects'),
    require('../services_endpoints/status')
]
