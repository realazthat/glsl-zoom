
const $ = require('jquery-browserify');
const resl = require('resl');
const regl = require('regl')();
const quad = require('glsl-quad');
const zoom = require('./glsl-zoom.js');

resl({
  manifest: {
    texture: {
      type: 'image',
      // quad provides a bitmap as a uri to display; the "directions" bitmap shows two
      // axis with up/down/right/left lines/arrows.
      src: quad.bitmaps.directions.uri,
      parser: (data) => regl.texture({
        data: data,
        mag: 'nearest',
        min: 'nearest',
        flipY: true
      })
    }
  },
  onDone: ({texture}) => {
    const drawTexture = regl({
      vert: zoom.shader.vert(),
      // frag: zoom.shader.frag(),
      frag: zoom.shader.frag({borderClamp: true, borderColor: 'uniform'}),
      attributes: {
        a_position: zoom.verts,
        a_uv: zoom.uvs
      },
      elements: zoom.indices,
      uniforms: {
        u_tex: regl.prop('texture'),
        u_clip_y: 1,
        u_zoom_uv_lower: regl.prop('lower'),
        u_zoom_uv_upper: regl.prop('upper'),
        u_border: [0, 0, 0, 1]
      }
    });

    let scaleSpeed = 1;
    let wheelDelta = 0;
    let translateStepY = () => 5.0 / $(window).height();
    let translateStepX = () => 5.0 / $(window).width();
    let zoomArea = {
      lower: [0, 0],
      upper: [1, 1]
    };
    let downKeys = {};

    function computeKbdDelta ({downKeys}) {
      let kbdDelta = [0, 0];

      if (downKeys[37]) {
        kbdDelta[0] = -1;
      }
      if (downKeys[39]) {
        kbdDelta[0] = +1;
      }
      if (downKeys[38]) {
        // up arrow (opengl convention, lower-left corner as the base)
        kbdDelta[1] = +1;
      }
      if (downKeys[40]) {
        // down arrow (opengl convention, lower-left corner as the base)
        kbdDelta[1] = -1;
      }
      return kbdDelta;
    }

    $('body').on('wheel', function (event) {
      wheelDelta += event.originalEvent.wheelDelta;
    });

    $('body').on('keydown', function (event) {
      downKeys[event.keyCode] = true;
    });

    $('body').on('keyup', function (event) {
      downKeys[event.keyCode] = false;
    });

    regl.frame(function ({time}) {
      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });

      // scale
      function doScale () {
        if (wheelDelta !== 0) {
          // compute the scale percent:
          // 1. the wheel delta will be in pixels.
          // 2. we want to know how many pixels on the screen the wheel went across
          //    (hence the division).
          // 3. multiplying that by the speed (which is in units of window-height-per-zoom-level), we get our ratio.
          let ratio = 1 + ((Math.abs(wheelDelta) * scaleSpeed) / $(window).height());

          // if the wheel was scrolled up/downward, we want to zoom in/out
          ratio = wheelDelta < 0 ? ratio : 1 / ratio;

          // console.log('ratio:',ratio);
          // console.log('zoomArea0:',zoomArea.lower, zoomArea.upper);
          zoom.util.scale({zoomArea, ratio});
          // zoom.util.clamp({zoomArea});
        }
      }

      // translation
      function doTranslate () {
        let kbdDelta = computeKbdDelta({downKeys});

        zoomArea.lower[0] += kbdDelta[0] * translateStepX();
        zoomArea.lower[1] += kbdDelta[1] * translateStepY();
        zoomArea.upper[0] += kbdDelta[0] * translateStepX();
        zoomArea.upper[1] += kbdDelta[1] * translateStepY();
        // zoom.util.clamp({zoomArea});
      }

      doScale();
      // reset the recorded wheel movement
      wheelDelta = 0;

      doTranslate();

      // console.log('zoomArea:',zoomArea.lower, zoomArea.upper);
      drawTexture({texture, lower: zoomArea.lower, upper: zoomArea.upper});
    });
  }
});
