
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

function zoomRegionValidity ({zoomRegion}) {
  if (Number.isNaN(zoomRegion.center.x) || Number.isNaN(zoomRegion.center.y)) {
    return false;
  }

  if (Number.isNaN(zoomRegion.radius.x) || Number.isNaN(zoomRegion.radius.y)) {
    return false;
  }

  if (!Number.isFinite(zoomRegion.center.x) || !Number.isFinite(zoomRegion.center.y)) {
    return false;
  }

  if (!Number.isFinite(zoomRegion.radius.x) || !Number.isFinite(zoomRegion.radius.y)) {
    return false;
  }

  return true;
}

function overlaps (x1, x2, y1, y2) {
  return Math.max(x1, y1) <= Math.min(x2, y2);
}

function contained (x, minVal, maxVal) {
  return x >= minVal && x <= maxVal;
}

function contained2d (x2d, lower2d, upper2d) {
  return contained(x2d.x, lower2d.x, upper2d.x) && contained(x2d.y, lower2d.y, upper2d.y);
}

function clampValue (x, minVal, maxVal) {
  return x < minVal ? minVal
                    : (x > maxVal ? maxVal
                                  : x);
}

function closestPoint2d (p0, lower, upper) {
  let p1 = {x: p0.x, y: p0.y};
  p1.x = clampValue(p1.x, lower.x, upper.x);
  p1.y = clampValue(p1.y, lower.y, upper.y);
  return p1;
}

function square (value) {
  return value * value;
}

function distance2d (lhs, rhs) {
  return Math.sqrt(square(lhs.x - rhs.x) + square(lhs.y - rhs.y));
}

function scaleZoomRegion ({ zoomRegion, ratio,
                            bounds = null, boundType = 'overlap',
                            minimumRadius = {x: 1.0 / (1 << 30), y: 1.0 / (1 << 30)},
                            maximumRadius = null,
                            radiusType = 'manhattan'}) {
  if (!zoomRegionValidity({zoomRegion})) {
    throw new Error('Whoops, zoomRegion became invalid!');
  }

  let sx = ratio.x;
  let sy = ratio.y;

  clampZoomRegion({zoomRegion, minimumRadius, maximumRadius, radiusType});

  if (bounds !== null && bounds !== undefined && boundType === 'clamp') {
    // assuming the center is inside the bounds.

    // distance from center to nearest left/right edge
    let maxRadiusX = Math.min(Math.abs(bounds.upper.x - zoomRegion.center.x), Math.abs(bounds.lower.x - zoomRegion.center.x));
    // distance from center to nearest up/down edge
    let maxRadiusY = Math.min(Math.abs(bounds.upper.y - zoomRegion.center.y), Math.abs(bounds.lower.y - zoomRegion.center.y));

    // max(r.x) = r0.x * max(s.x)
    // max(s.x) = max(r.x) / r0.x

    if (zoomRegion.radius.x !== 0) {
      let maxsx = maxRadiusX / zoomRegion.radius.x;
      sx = Math.min(sx, maxsx);
    }

    if (zoomRegion.radius.y !== 0) {
      let maxsy = maxRadiusY / zoomRegion.radius.y;
      sy = Math.min(sy, maxsy);
    }
    
  } else if (bounds !== null && bounds !== undefined && boundType === 'overlap') {
    if (!contained2d(zoomRegion.center, bounds.lower, bounds.upper)) {
      let p2d = closestPoint2d(zoomRegion.center, bounds.lower, bounds.upper);
      let d2d = distance2d(zoomRegion.center, p2d);

      // r.x = r0.x * s.x
      // min(r.x) = r0.x * min(s.x)
      // d2d = min(r.x)
      // d2d = r0.x * min(s.x)
      // min(s.x) = d2d / r0.x

      if (zoomRegion.radius.x !== 0) {
        let minsx = d2d / zoomRegion.radius.x;
        sx = Math.max(minsx, sx);
      }

      if (zoomRegion.radius.y !== 0) {
        let minsy = d2d / zoomRegion.radius.y;
        sy = Math.max(minsy, sy);
      }
    } else {
      // nothing to do; the center is within the bounds, it will always be overlapping,
      // so no need to limit the scaling.
    }
  }

  zoomRegion.radius.x *= sx;
  zoomRegion.radius.y *= sy;

  clampZoomRegion({zoomRegion, bounds, boundType, minimumRadius, maximumRadius, radiusType});

  if (!zoomRegionValidity({zoomRegion})) {
    throw new Error('Whoops, zoomRegion became invalid!');
  }
}

function isZoomRegionContainedInBounds ({zoomRegion, bounds, radiusType = 'manhattan'}) {
  let minX = zoomRegion.center.x - zoomRegion.radius.x;
  let minY = zoomRegion.center.y - zoomRegion.radius.y;
  let maxX = zoomRegion.center.x + zoomRegion.radius.x;
  let maxY = zoomRegion.center.y + zoomRegion.radius.y;

  if (!contained2d(zoomRegion.center, bounds.lower, bounds.upper)) {
    return false;
  }

  if (!contained2d({x: minX, y: minY}, bounds.lower, bounds.upper)) {
    return false;
  }

  if (!contained2d({x: minX, y: maxY}, bounds.lower, bounds.upper)) {
    return false;
  }

  if (!contained2d({x: maxX, y: minY}, bounds.lower, bounds.upper)) {
    return false;
  }

  if (!contained2d({x: maxX, y: maxY}, bounds.lower, bounds.upper)) {
    return false;
  }

  return true;
}

function isZoomRegionOverlappingBounds ({zoomRegion, bounds, radiusType = 'manhattan'}) {
  let minX = zoomRegion.center.x - zoomRegion.radius.x;
  let minY = zoomRegion.center.y - zoomRegion.radius.y;
  let maxX = zoomRegion.center.x + zoomRegion.radius.x;
  let maxY = zoomRegion.center.y + zoomRegion.radius.y;

  return overlaps(minX, maxX, bounds.lower.x, bounds.upper.x) && overlaps(minY, maxY, bounds.lower.y, bounds.upper.y);
}

function clampZoomRegion ({ zoomRegion, bounds = null, boundType = 'overlap',
                            minimumRadius = {x: 1.0 / (1 << 30), y: 1.0 / (1 << 30)},
                            maximumRadius = null,
                            radiusType = 'manhattan'}) {

  if (!zoomRegionValidity({zoomRegion})) {
    throw new Error('Whoops, zoomRegion became invalid!');
  }

  if (bounds !== null && bounds !== undefined) {
    let valid = {
      lower: {
        x: bounds.lower.x,
        y: bounds.lower.y
      },
      upper: {
        x: bounds.upper.x,
        y: bounds.upper.y
      }
    };

    let boundsCenter = {
      x: bounds.lower.x + (bounds.upper.x - bounds.lower.x) / 2.0,
      y: bounds.lower.y + (bounds.upper.y - bounds.lower.y) / 2.0
    };

    if (boundType === 'clamp') {
      // now adjust the valid rectangle.
      // contract the rectangle by the radius; if it has negative area, readjust it to have
      // zero area and positioned at the center of the bounds.
      valid.lower.x = clampValue(bounds.lower.x + zoomRegion.radius.x, bounds.lower.x, boundsCenter.x);
      valid.upper.x = clampValue(bounds.upper.x - zoomRegion.radius.x, boundsCenter.x, bounds.upper.x);
      valid.lower.y = clampValue(bounds.lower.y + zoomRegion.radius.y, bounds.lower.y, boundsCenter.y);
      valid.upper.y = clampValue(bounds.upper.y - zoomRegion.radius.y, boundsCenter.y, bounds.upper.y);
    } else if (boundType === 'overlap') {
      // now adjust the valid rectangle.
      // expand the bounds by the radius.
      valid.lower.x = bounds.lower.x - zoomRegion.radius.x;
      valid.lower.y = bounds.lower.y - zoomRegion.radius.y;
      valid.upper.x = bounds.upper.x + zoomRegion.radius.x;
      valid.upper.y = bounds.upper.y + zoomRegion.radius.y;
    }

    if (!contained2d(zoomRegion.center, valid.lower, valid.upper)) {
      let p2d = closestPoint2d(zoomRegion.center, valid.lower, valid.upper);
      zoomRegion.center.x = p2d.x;
      zoomRegion.center.y = p2d.y;
    }
  }

  if (minimumRadius !== null && minimumRadius !== undefined) {
    zoomRegion.radius.x = Math.max(zoomRegion.radius.x, minimumRadius.x);
    zoomRegion.radius.y = Math.max(zoomRegion.radius.y, minimumRadius.y);
  }
  if (maximumRadius !== null && maximumRadius !== undefined) {
    zoomRegion.radius.x = Math.min(zoomRegion.radius.x, maximumRadius.x);
    zoomRegion.radius.y = Math.min(zoomRegion.radius.y, maximumRadius.y);
  }

  if (!zoomRegionValidity({zoomRegion})) {
    throw new Error('Whoops, zoomRegion became invalid!');
  }
}

function translateZoomRegion ({zoomRegion, delta, bounds = null, boundType = 'overlap', radiusType = 'manhattan'}) {
  let dx = delta.x;
  let dy = delta.y;

  let minX = zoomRegion.center.x - zoomRegion.radius.x;
  let minY = zoomRegion.center.y - zoomRegion.radius.y;
  let maxX = zoomRegion.center.x + zoomRegion.radius.x;
  let maxY = zoomRegion.center.y + zoomRegion.radius.y;

  if (bounds !== null && bounds !== undefined && boundType === 'clamp') {
    let maxdx = bounds.upper.x - maxX;
    let maxdy = bounds.upper.y - maxY;
    let mindx = bounds.lower.x - minX;
    let mindy = bounds.lower.y - minY;

    dx = clampValue(dx, mindx, maxdx);
    dy = clampValue(dy, mindy, maxdy);
  } else if (bounds !== null && bounds !== undefined && boundType === 'overlap') {
    // distance from leftmost edge to the right edge of the bounds.
    let maxdx = bounds.upper.x - minX;
    let maxdy = bounds.upper.y - minY;

    let mindx = -(maxX - bounds.lower.x);
    let mindy = -(maxY - bounds.lower.y);

    dx = clampValue(dx, mindx, maxdx);
    dy = clampValue(dy, mindy, maxdy);
  }

  zoomRegion.center.x += dx;
  zoomRegion.center.y += dy;

  clampZoomRegion({zoomRegion, bounds, boundType, radiusType});
}

function cloneZoomRegion ({zoomRegion}) {
  return {
    center: {
      x: zoomRegion.center.x,
      y: zoomRegion.center.y
    },
    radius: {
      x: zoomRegion.radius.x,
      y: zoomRegion.radius.y
    }
  };
}

function uvRadiusLower ({zoomRegion, radiusType = 'manhattan'}) {
  let lower = [zoomRegion.center.x - zoomRegion.radius.x, zoomRegion.center.y - zoomRegion.radius.y];
  return lower;
}

function uvRadiusUpper ({zoomRegion, radiusType = 'manhattan'}) {
  let upper = [zoomRegion.center.x + zoomRegion.radius.x, zoomRegion.center.y + zoomRegion.radius.y];
  return upper;
}

function computeKbdDelta ({downKeys}) {
  let kbdDelta = {x: 0, y: 0};

  if (downKeys[37] || downKeys[65] || downKeys[100]) {
    // left arrow or 's' or numpad '4'
    kbdDelta.x += -1;
  }

  if (downKeys[39] || downKeys[68] || downKeys[102]) {
    // left right or 'd' or numpad '6'
    kbdDelta.x += +1;
  }

  if (downKeys[38] || downKeys[87] || downKeys[104]) {
    // up arrow or 'w' or numpad '8'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.y += +1;
  }

  if (downKeys[40] || downKeys[83] || downKeys[98]) {
    // down arrow or 's' or numpad '2'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.y += -1;
  }

  if (downKeys[97]) {
    // numpad '1'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.x += -1;
    kbdDelta.y += -1;
  }

  if (downKeys[99]) {
    // numpad '3'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.x += +1;
    kbdDelta.y += -1;
  }

  if (downKeys[103]) {
    // numpad '7'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.x += -1;
    kbdDelta.y += +1;
  }

  if (downKeys[105]) {
    // numpad '9'
    // (opengl convention, lower-left corner as the base)
    kbdDelta.x += +1;
    kbdDelta.y += +1;
  }

  return kbdDelta;
}

module.exports = {verts: quad.verts, indices: quad.indices, uvs: quad.uvs,
                  shader: {
                    vert: vshader,
                    frag: fshader
                  },
                  region: {
                    translate: translateZoomRegion,
                    scale: scaleZoomRegion,
                    clamp: clampZoomRegion,
                    uv: {
                      lower: uvRadiusLower,
                      upper: uvRadiusUpper
                    },
                    clone: cloneZoomRegion,
                    test: {
                      bounds: {
                        overlaps: isZoomRegionOverlappingBounds,
                        contains: isZoomRegionContainedInBounds
                      }
                    }
                  },
                  util: {
                    delta: {
                      kbd: computeKbdDelta
                    }
                  }
                };
