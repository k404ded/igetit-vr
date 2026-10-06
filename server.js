/**
 * Root Server Entrypoint
 * Forwards execution to igetit-vr/server.js
 */
const path = require('path');
const targetDir = path.join(__dirname, 'igetit-vr');
process.chdir(targetDir);
require(path.join(targetDir, 'server.js'));
