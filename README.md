
glsl-zoom
---

####Look

branch  | demo
--------|-------
master  | [glsl-zoom-demo](https://realazthat.github.io/glsl-zoom/master/www/glsl-zoom-demo/index.html)
develop | [glsl-zoom-demo](https://realazthat.github.io/glsl-zoom/develop/www/glsl-zoom-demo/index.html)


####Description

glsl-zoom is a shader generator for WebGL, to easily display a specific subwindow (zoom) of a larger texture.

See `glsl-zoom-demo.js` for usage.

####Dependencies

* nodejs
* browserify
* [glsl-quad](https://github.com/realazthat/glsl-quad)
* [regl](https://github.com/mikolalysenko/regl) (for demo)
* [resl](https://github.com/mikolalysenko/resl) (for demo)
* jquery-browserify (for demo)
* nunjucks (for demo)
* budo (for quick demo as an alternative to running browserify) 


####Demo

To run the demo, run:

```
    cd ./glsl-zoom
    
    #install npm dependencies
    npm install
    
    #browser should open with the demo
    budo glsl-zoom-demo.js --open


```

####Docs

```
const zoom = require('./glsl-zoom.js');
```

The general idea is:

1. the library acts almost like [glsl-quad](https://github.com/realazthat/glsl-quad).
2. it provides vertices, indices, uvs, vertex and fragment shaders.
3. it requires the same uniforms as `glsl-quad`.
4. it requires two additional uniforms that represent the view-rectangle within the texture.
5. a smaller view-rectangle means a closer zoom.
6. the view-rectangle is specified via a "lower" and "upper" set of coordinates.
7. the view-rectangle is in the same units as the uvs.


##### `zoom.verts`

* A list of vertices that can be used for webgl positions, that make up a quad (two triangles).

##### `zoom.indices`

* A list of indices that can be used for webgl triangles, that make up a quad (two triangles).

##### `zoom.uvs`

* A list of uv attributes for the vertices.

##### `zoom.shader.vert()`

* Returns the webgl 1.0 vertex shader to use.
* The vertex shader expects:
    * A uniform float named `u_clip_y`, representing whether to flip the y-axis; values of 1 or -1.
    * An attribute list of vec2 positions of the vertices named `a_position`.
    * An attribute list of vec2 uvs of the vertices named `a_uv`.

##### `zoom.shader.frag({borderClamp = false, borderColor = 'vec4(0,0,0,1)})`

* A function that returns the webgl 1.0 fragment shader to use.
* `borderClamp` - A boolean indicating if the shader should use a border color when
  showing things off the edge of the texture; default is false, and the result is whatever
  WebGL clamping is chosen.
* `borderColor` - A string containing a glsl vec4 value that will be used the for the
                  over-the-border-color if `borderClamp` is set to true. can optionally
                  use the keyword string `uniform`, which will then make the fragment
                  shader expect a uniform `vec4` with the name `u_border`.
* The fragment shader uniforms:
  * A uniform shader (sampler2D) named `u_tex`.
  * A uniform `vec2` named `u_zoom_uv_lower`, having values in the range [0,1],
    and representing the "lower" corner of a rectangle in uv-space of the texture.
    Note that opengl convention is uv-origin at the lower-left.
  * A uniform `vec2` named `u_zoom_uv_upper`, having values in the range [0,1],
    and representing the "upper" corner of a rectangle in uv-space of the texture.
    Note that opengl convention is uv-origin at the lower-left.
  * Optionally, if `borderClamp` is set as true, a uniform `vec4` named `u_border`,
    having a color value (each component in the range `[0, 1]`). This color will be
    used for pixels that are not within the texture (i.e instead of whatever clamp
    the texture is set to).


####Advanced Docs

Controlling the view window is simple, but powerful, but can be a bit of work.

`glsl-zoom` provides some helper functions to do this. The following is the API documentation
of these functions.

##### `zoomRegion`

A common argument in the API, which represents a "circular" zoom region, with a center, and a radius.
**Note that although it has a "radius", the library currently supports only
"[manhattan distance](https://en.wikipedia.org/wiki/Taxicab_geometry)", which
effectively makes it a rectangle**.

The form is documented here, instead of in each method:

```
// pointing at the center, with a radius covering the entire texture.
let zoomRegion = {
  center: {x: .5, y: .5},
  radius: {x: .5, y: .5}
};
```

##### `zoom.region.translate ({zoomRegion, delta, bounds = null, boundType = 'overlap'})`

This function translates a `zoomRegion` in-place, by `delta`.

- `zoomRegion` - The region that needs to be translated.
- `delta` - The delta to translate the `zoomRegion` by; of the form `{x: 0.1, y: -0.2}`.
- `bounds` - An optional parameter that will bound the translation, the type of bounding
            is specified by the `boundType` argument. `bounds` is of the form
            `bounds = {lower: {x: 0, y: 0}, upper: {x: 1, y: 1}}`. Defaults to `null`,
            which means it will not be bounded and the function will translate freely.
- `boundType` - A string value, one of `overlap` or `clamp`. Goes together with the `bounds`
            parameter. Defaults to `overlap`. **NOTE: this argument is named **`boundType`**,
            NOT `boundsType`.
            * `clamp` - the `zoomRegion` will not be allowed to translate
                outside of the `bounds` at all.
            * `overlap` - the `zoomRegion` will not be allowed to translate to a location where
                it can no longer see the `bounds` region.

##### `zoom.region.scale (zoomRegion, ratio, bounds = null, boundType = 'overlap', minimumRadius = {x: 1.0 / (1 << 30), y: 1.0 / (1 << 30)}, maximumRadius = null)`

Scales the `zoomRegion` by modifying the radius. Operates in-place.
Similar to `zoom.region.translate()`, see that method for more detailed
docs on some of the params.

- `zoomRegion` - The region that needs to be translated.
- `ratio` - The radius will be multiplied by this value.
- `bounds` - The radius will not grow outside of the bounds, which has a different logical meaning
              depending on the value of `boundType`. See `zoom.region.translate()`.
- `boundType` - Modifies the meaning of the `bounds` argument. See `zoom.region.translate()`.
- `minimumRadius` - Before and after scaling, the radius will be clamped between `minimumRadius`
                    and `maximumRadius`, if they are not `null`. This can be important for avoiding
                    `NaNs`. Defaults to a very small number (`1.0 / (1 << 30)`).

##### `zoom.region.clamp ({ zoomRegion, bounds = null, boundType = 'overlap', minimumRadius = {x: 1.0 / (1 << 30), y: 1.0 / (1 << 30)}, maximumRadius = null})`

Clamps the region, by `bounds` or by radius. See `zoom.region.translate()`.

##### `zoom.region.clone ({zoomRegion})`

Returns a deep copy of a `zoomRegion`.

##### `zoom.test.bounds.overlaps ({zoomRegion, bounds})`

Checks if a `zoomRegion` overlaps a `bounds`.  See `zoom.region.translate()`.

##### `zoom.test.bounds.contains ({zoomRegion, bounds})`

Checks if a `zoomRegion` is completely contained by `bounds`.  See `zoom.region.translate()`.

##### `zoom.util.delta.kbd ({downKeys})`

A helper function that computes a `delta` from the current set of keyboard keys that are pressed.

- `downKeys - A dictionary of JavaScript "key codes" as keys, and `true/false` values to indicate
              which keys are currently pressed.

- Returns a dictionary of the form `{x: +1, y: 0}` which indicates what the combination of arrow
  keys, numpad keys, `WASD` keys make up in intended direction.


##### `zoom.uv.lower ({zoomRegion})`

Returns a list of the two lower coordinates.

So a region like `zoomRegion = {center: {x: 0.5, y: 0.5}, radius: {x: 0.1, y: 0.1}}` would result
in a list such as `[0.4, 0.4]`.


##### `zoom.uv.lower ({zoomRegion})`

Returns a list of the two upper coordinates.

So a region like `zoomRegion = {center: {x: 0.5, y: 0.5}, radius: {x: 0.1, y: 0.1}}` would result
in a list such as `[0.6, 0.6]`.


####Usage

See `glsl-zoom-demo.js` for a full demo using [regl](https://github.com/mikolalysenko/regl)
and [resl](https://github.com/mikolalysenko/resl).

An excerpt:

```


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

    // will zoom into a region of the texture from `(0.2, 0.2) => (0.7, 0.7)`, a 2X zoom in.
    // change these values to control the view-window.
    drawTexture({texture, lower: [.2, .2], upper: [.7, .7]});


```


