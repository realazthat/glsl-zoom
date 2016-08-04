(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.glslZoom = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

const quad = require('glsl-quad');

function vshader () {
  return quad.shader.vert;
}

function fshader ({borderClamp = false, borderColor = 'vec4(0,0,0,1)'}) {
  let borderUniformCode = '';

  if (borderColor === 'uniform') {
    borderUniformCode = 'uniform vec4 u_border;';
    borderColor = 'u_border';
  }

  let borderClampCode = `
      if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1)))) {
        gl_FragColor = ${borderColor};
      }
  `;

  return `
    precision mediump float;

    varying vec2 v_uv;
    
    uniform vec2 u_zoom_uv_lower;
    uniform vec2 u_zoom_uv_upper;
    ${borderUniformCode}

    uniform sampler2D u_tex;

    vec2 lerp2(vec2 a, vec2 b, vec2 t){
      return a + (b-a)*t;
    }

    void main () {
      // uv will interpolate between the lower and upper locations, using v_uv.
      vec2 uv = lerp2(u_zoom_uv_lower, u_zoom_uv_upper, v_uv);

      gl_FragColor = texture2D(u_tex, uv);
      ${borderClampCode}
      // gl_FragColor = vec4(v_uv,0,1);
    }
  `;
}

function scaleZoomArea ({zoomArea, ratio}) {
  let zoomDims = [zoomArea.upper[0] - zoomArea.lower[0], zoomArea.upper[1] - zoomArea.lower[0]];
  let center = [zoomArea.lower[0] + zoomDims[0] / 2.0, zoomArea.lower[1] + zoomDims[1] / 2.0];

  zoomDims[0] *= ratio;
  zoomDims[1] *= ratio;

  zoomArea.lower[0] = center[0] - zoomDims[0] / 2.0;
  zoomArea.lower[1] = center[1] - zoomDims[1] / 2.0;

  zoomArea.upper[0] = center[0] + zoomDims[0] / 2.0;
  zoomArea.upper[1] = center[1] + zoomDims[1] / 2.0;
}

function clampValue (x, minVal, maxVal) {
  return x < minVal ? minVal
                    : (x > maxVal ? maxVal
                                  : x);
}

function clampZoomArea ({zoomArea, clampArea = {lower: [0, 0], upper: [1, 1]}}) {
  for (let i = 0; i < 2; ++i) {
    zoomArea.lower[i] = clampValue(zoomArea.lower[i], clampArea.lower[i], clampArea.upper[i]);
    zoomArea.upper[i] = clampValue(zoomArea.upper[i], clampArea.lower[i], clampArea.upper[i]);
  }
}

module.exports = {verts: quad.verts, indices: quad.indices, uvs: quad.uvs,
                  shader: {vert: vshader, frag: fshader},
                  util: {
                    scale: scaleZoomArea,
                    clamp: clampZoomArea
                  }};


},{"glsl-quad":2}],2:[function(require,module,exports){

const verts = [
  [-1.0, -1.0],
  [+1.0, -1.0],
  [-1.0, +1.0],
  [-1.0, +1.0],
  [+1.0, -1.0],
  [+1.0, +1.0]
];

const uvs = [
  [0.0, 0.0],
  [1.0, 0.0],
  [0.0, 1.0],
  [0.0, 1.0],
  [1.0, 0.0],
  [1.0, 1.0]
];

const indices = [
  [0, 1, 2],
  [3, 4, 5]
];

const vshader = `
  precision mediump float;
  attribute vec2 a_position;
  attribute vec2 a_uv;

  uniform float u_clip_y;

  varying vec2 v_uv;
  
  void main() {
    v_uv = a_uv;
    gl_Position = vec4(a_position * vec2(1,u_clip_y), 0, 1);
  }
`;

const fshader = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_tex;
  void main () {
    gl_FragColor = texture2D(u_tex,v_uv);
  }
`;

const showUVsFshader = `
  precision mediump float;
  varying vec2 v_uv;
  void main () {
    gl_FragColor = vec4(v_uv,0,1);
  }
`;


const showPositionsVshader = `
  precision mediump float;
  attribute vec2 a_position;

  uniform float u_clip_y;

  varying vec2 v_uv;
  
  void main() {
    gl_Position = vec4(a_position * vec2(1,u_clip_y), 0, 1);
    v_uv = gl_Position.xy;
  }
`;

const showPositionsFshader = `
  precision mediump float;
  varying vec2 v_uv;
  void main () {
    gl_FragColor = vec4(v_uv,0,1);
  }
`;

const directionsDataUri = `
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAA
BACAIAAAAlC+aJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQ
UAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAEbSURBVGhD7dhRDsIgEI
RhjubNPHqlHUTAdjfRWRKa+UIirQnd376Z0vZZG1vQsfvB76WAa3
En3yug3GHD0HX6gIZCAaYaEGdSQM2g9yjApADfpIBhTzQvIIgCTA
rwKcCkAJ8CTArwKcCkAN/56Y/8XAZCwH7AsS6sEDBseisEYF1YIW
DY9Lq7eW6Mjk29/Bk/YD+vO7Bc/D/rKULAqSbj80tHrOehPC9mjY
/krhkBeBF4HvZE6CgXRJgeW3wAPYMf0IwO1NO/RL2BhgJMCvApwK
QAnwJMCvApwKQAnwJMCvApwNQGYE/vmRowbCgUYLpbQHvJMi8gSN
TpmLsGxGWsH9Aq90gwfW1gwv9zx+qUr0mWD8hCps/uE5DSC/pgVD
kvIARVAAAAAElFTkSuQmCC`.replace(/\s*/g, '');

const bitmaps = {
  directions: {uri: directionsDataUri}
};

module.exports = {verts, indices, uvs, shader: {vert: vshader, frag: fshader},
                  show: {
                    uvs: {frag: showUVsFshader, vert: vshader},
                    positions: {frag: showPositionsFshader, vert: showPositionsVshader}
                  },
                  bitmaps};

},{}]},{},[1])(1)
});