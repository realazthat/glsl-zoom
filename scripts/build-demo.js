
var builder = require('./build-a-demo.js');

const BUILDDIR = './www/glsl-zoom-demo/';
const MAINJSFILE = 'glsl-zoom-demo.js';
const MAINHTMLFILE = 'index.html';
const TITLE = 'glsl-zoom Demo';

builder.buildADemo({BUILDDIR, MAINJSFILE, MAINHTMLFILE, TITLE});
