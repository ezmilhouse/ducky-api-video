// bootstrapper: finds the shared config script by suffix pattern
let fs   = require('fs')
let path = require('path')
let root = path.resolve(__dirname, '..')
let dirs = fs.readdirSync(root)
let shared = null

for (let i = 0; i < dirs.length; i++) {

    let full = path.join(root, dirs[i])

    try {
        if (fs.statSync(full).isDirectory() && dirs[i].endsWith('_shared')) {
            shared = full
            break
        }
    } catch (e) {
        // skip
    }

}

if (!shared) {
    console.log('[err] could not find *_shared sibling directory')
    process.exit(1)
}

require(path.join(shared, 'scripts', 'config.js'))
