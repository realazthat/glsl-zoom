
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

