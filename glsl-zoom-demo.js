
const $ = require('jquery-browserify');
const resl = require('resl');
const regl = require('regl')();
const quad = require('glsl-quad');
const nunjucks = require('nunjucks');
const zoom = require('./glsl-zoom.js');

function updateBounds ({zoomBounds, readUI = false, writeUI = false}) {
  if (readUI) {
    zoomBounds.lower.x = parseFloat($('#bounds-lower-x').val());
    zoomBounds.lower.y = parseFloat($('#bounds-lower-y').val());
    zoomBounds.upper.x = parseFloat($('#bounds-upper-x').val());
    zoomBounds.upper.y = parseFloat($('#bounds-upper-y').val());
  }

  if (writeUI) {
    $('#bounds-lower-x').val(zoomBounds.lower.x);
    $('#bounds-lower-y').val(zoomBounds.lower.y);
    $('#bounds-upper-x').val(zoomBounds.upper.x);
    $('#bounds-upper-y').val(zoomBounds.upper.y);
  }

  $('#bounds-view').text(`(${zoomBounds.lower.x},${zoomBounds.lower.y}) <=> (${zoomBounds.upper.x},${zoomBounds.upper.y})`);
}

function updateBoundType ({bound, readUI = false, writeUI = false}) {
  if (readUI) {
    if ($('#bound-type-clamp').is(':checked')) {
      bound.boundType = 'clamp';
    }
    if ($('#bound-type-overlap').is(':checked')) {
      bound.boundType = 'overlap';
    }
  }

  if (writeUI) {
    if (bound.boundType === 'overlap') {
      $('#bound-type-overlap').attr('checked', true);
    } else if (bound.boundType === 'clamp') {
      $('#bound-type-clamp').attr('checked', true);
    }
  }

  $('#bound-type-view').text(bound.boundType);
}


function updateCenter ({zoomRegion, readUI = false, writeUI = false}) {
  if (readUI) {
    zoomRegion.center.x = parseFloat($('#center-x').val());
    zoomRegion.center.y = parseFloat($('#center-y').val());
  }

  if (writeUI) {
    $('#center-x').val(zoomRegion.center.x);
    $('#center-y').val(zoomRegion.center.y);
  }

  $('#center-view').text(`(${zoomRegion.center.x},${zoomRegion.center.y})`);
}

function updateRadius ({zoomRegion, readUI = false, writeUI = false}) {
  if (readUI) {
    zoomRegion.radius.x = parseFloat($('#radius-x').val());
    zoomRegion.radius.y = parseFloat($('#radius-y').val());
  }

  if (writeUI) {
    $('#radius-x').val(zoomRegion.radius.x);
    $('#radius-y').val(zoomRegion.radius.y);
  }

  $('#radius-view').text(`(${zoomRegion.radius.x},${zoomRegion.radius.y})`);
}

function setupUI ({zoomRegion, zoomBounds, bound}) {
  $('canvas').css('z-index', '-10');
  let $page = $('<div class="page">')
    .css('z-index', '10')
    .css('background-color', 'rgba(73, 162, 89, 0.51)')
    .css('color', '#000000')
    .appendTo($('body'));

  let $controlsDiv = $('<div/>').appendTo($page);

  let template = `
  <div class="modal" style="display: none">
    <div class="modal-content">
      <h3>
        1. mouse to scroll
      </h3>
      <h3>
        2. drag to move arround
      </h3>
      <h3>
        3. arrows to move around.
      </h3>
      <h3>
        4. numpad arrows to move around.
      </h3>
    </div>
  </div>
  <table class="controls">
    <tr>
    </tr>
    <tr>
      <td>Bounds</td>
      <td>
        <div>
          <label for="bounds-lower-x">bounds-lower-x</label>
          <input type="number" id="bounds-lower-x" value="0.01" step=".02" />
        </div>
        <div>
          <label for="bounds-lower-y">bounds-lower-y</label>
          <input type="number" id="bounds-lower-y" value="0.01" step=".02" />
        </div>
        <div>
          <label for="bounds-upper-x">bounds-upper-x</label>
          <input type="number" id="bounds-upper-x" value="0.98" step=".02" />
        </div>
        <div>
          <label for="bounds-upper-y">bounds-upper-y</label>
          <input type="number" id="bounds-upper-y" value="0.98" step=".02" />
        </div>
      </td>
      <td><span id="bounds-view"/></td>
    </tr>
    <tr>
      <td>Bound Type</td>
      <td style="text-align: center">
        <label for="bound-type-clamp">clamp</label>
        <input type="radio" id="bound-type-clamp" name="bound-type" value="clamp" />
        <label for="bound-type-overlap">overlap</label>
        <input type="radio" id="bound-type-overlap" name="bound-type" value="overlap" checked="checked" />
      </td>
      <td><span id="bound-type-view" /></td>
    </tr>
    <tr>
      <td>Center</td>
      <td>
        <input type="number" id="center-x" value=".5" step=".02"/>
        <input type="number" id="center-y" value=".5" step=".02" />
      </td>
      <td><span id="center-view" /></td>
    </tr>
    <tr>
      <td>Radius</td>
      <td>
        <input type="number" id="radius-x" value=".7" step=".02"/>
        <input type="number" id="radius-y" value=".7" step=".02"/>
      </td>
      <td><span id="radius-view" /></td>
    </tr>
  </table>
  `;

  $controlsDiv.html(nunjucks.renderString(template));

  $('.modal')
    .css('position', 'fixed')
    .css('z-index', '100')
    .css('left', '0')
    .css('top', '0')
    .css('width', '100%')
    .css('height', '100%')
    .css('overflow', 'auto')
    .css('background-color', 'rgba(0,0,0,.1)');
  $('.modal > .modal-content')
    .css('background-color', '#162827')
    .css('color', '#8E4325')
    .css('padding', '2em')
    .css('margin', '15% auto')
    .css('border', '2px solid #8E4325')
    .css('border-radius', '25px')
    .css('width', '60%');

  $('.modal')
    .fadeIn(300)
    .on('click', function () {
      $(this).fadeOut(300);
    });

  // initialize the `#bounds-view` once.
  updateBounds({zoomBounds, readUI: true});

  $('#bounds-lower-x').on('change', () => updateBounds({zoomBounds, readUI: true}));
  $('#bounds-lower-y').on('change', () => updateBounds({zoomBounds, readUI: true}));
  $('#bounds-upper-x').on('change', () => updateBounds({zoomBounds, readUI: true}));
  $('#bounds-upper-y').on('change', () => updateBounds({zoomBounds, readUI: true}));

  // initialize the `#bound-type-view` once.
  updateBoundType({bound, readUI: true});

  $('#bound-type-overlap').on('change', () => updateBoundType({bound, readUI: true}));
  $('#bound-type-clamp').on('change', () => updateBoundType({bound, readUI: true}));

  // initialize the `#center-view` once.
  updateCenter({zoomRegion, readUI: true});

  $('#center-x').on('change', () => updateCenter({zoomRegion, readUI: true}));
  $('#center-y').on('change', () => updateCenter({zoomRegion, readUI: true}));

  // initialize the `#radius-view` once.
  updateRadius({zoomRegion, readUI: true});

  $('#radius-x').on('change', () => updateRadius({zoomRegion, readUI: true}));
  $('#radius-y').on('change', () => updateRadius({zoomRegion, readUI: true}));
}

// -----------------------------------------------------------------------------

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
    let downKeys = {};
    let zoomRegion = {
      center: {
        x: 0.5,
        y: 0.5
      },
      radius: {
        x: 0.5,
        y: 0.5
      }
    };
    let zoomBounds = {
      lower: {x: 0, y: 0},
      upper: {x: 1, y: 1}
    };
    let current = {
      texture: texture
    };

    // keep this in a dictionary, because setupUI will be altering it.
    let bound = {
      boundType: 'overlap'
    };

    let mouse = {
      tracking: false,
      location: null,
      delta: {x: 0, y: 0}
    };

    $('body').on('wheel', function (event) {
      wheelDelta += event.originalEvent.deltaY;
    });

    $('body').on('keydown', function (event) {
      downKeys[event.keyCode] = true;
    });

    $('body').on('keyup', function (event) {
      downKeys[event.keyCode] = false;
    });

    $('canvas').on('mousedown', function (event) {
      mouse.tracking = true;
      mouse.location = {x: event.pageX, y: event.pageY};
    });

    $('canvas').on('dragstart', function (event) {
      event.preventDefault();
      return false;
    });

    $(document).on('mousemove', function (event) {
      if (mouse.tracking) {
        mouse.delta.x += event.pageX - mouse.location.x;
        mouse.delta.y += event.pageY - mouse.location.y;
        mouse.location = {x: event.pageX, y: event.pageY};
      }
    });

    $(document).on('mouseout', function (event) {
      mouse.tracking = false;
    });

    $('canvas').on('mouseup', function () {
      mouse.tracking = false;
    });

    setupUI({zoomRegion, zoomBounds, bound});

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
          ratio = wheelDelta > 0 ? ratio : 1 / ratio;

          zoom.region.scale({zoomRegion, ratio: {x: ratio, y: ratio}, bounds: zoomBounds, boundType: bound.boundType});

          updateBounds({zoomBounds, writeUI: true});
          updateCenter({zoomRegion, writeUI: true});
          updateRadius({zoomRegion, writeUI: true});
          updateBoundType({bound, writeUI: true});
        }
      }

      // translation
      function doTranslate () {
        let kbdDelta = zoom.util.delta.kbd({downKeys});

        if (kbdDelta.x === 0 && kbdDelta.y === 0 && mouse.delta.x === 0 && mouse.delta.y === 0) {
          return;
        }
        let delta = {
          x: kbdDelta.x * translateStepX(),
          y: kbdDelta.y * translateStepY()
        };

        // have to invert it.
        delta.x += -mouse.delta.x / $(window).width();
        // have to invert it.
        // have to invert it back, because opengl is using the lower-left corner as origin.
        delta.y += -(-mouse.delta.y / $(window).height());

        // a delta of 1 should move 2x the radius.
        delta.x *= zoomRegion.radius.x * 2;
        delta.y *= zoomRegion.radius.y * 2;

        // console.log('zoomRegion.center:', zoomRegion.center);
        zoom.region.translate({zoomRegion, delta, bounds: zoomBounds, boundType: bound.boundType});

        // reset the mouse drag delta
        mouse.delta.x = 0;
        mouse.delta.y = 0;

        updateBounds({zoomBounds, writeUI: true});
        updateCenter({zoomRegion, writeUI: true});
        updateRadius({zoomRegion, writeUI: true});
        updateBoundType({bound, writeUI: true});
      }

      doScale();
      // reset the recorded wheel movement
      wheelDelta = 0;

      doTranslate();

      let zoomArea = {
        lower: zoom.region.uv.lower({zoomRegion}),
        upper: zoom.region.uv.upper({zoomRegion})
      };

      drawTexture({texture: current.texture, lower: zoomArea.lower, upper: zoomArea.upper});
    });
  }
});
