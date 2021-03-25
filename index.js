(function () {
    'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function getRenderingContext(canvas) {
        const gl = canvas.getContext('webgl');
        if (!gl) {
            alert('webGL is not supported');
            return null;
        }
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return gl;
    }
    function createShader(gl, shaderSource, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw Error(`Failed to compile shader: ${gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }

    let canvas;
    let clicked = false;
    EventTarget.prototype.once = function (name, fn, ...args) {
        function handler(evt) {
            if (typeof fn === 'function') {
                fn(evt);
            }
            else if (fn && typeof fn === 'object') {
                fn.handleEvent(evt);
            }
            this.removeEventListener(name, handler);
        }
        this.addEventListener(name, handler, ...args);
    };
    const vertexShaderSource = `
#version 100
attribute vec2 coordinates;
void main() {
  gl_Position = vec4(coordinates, .0, 1.0);
}
`;
    const fragmentShaderSource = `
#version 100

precision lowp float;

uniform float time;
uniform vec2 screenSize;
uniform vec2 center;
uniform float zoomLevel;
uniform float iterLimit;

void main() {
  vec2 coords = gl_FragCoord.xy / screenSize.xy;

  vec2 topLeft = vec2(-2., -1.) / (zoomLevel*zoomLevel) + center;
  vec2 botRight = vec2(1., 1.) / (zoomLevel*zoomLevel) + center;
  vec2 pt = mix(topLeft, botRight, coords);
  vec2 pt0 = pt;

  for (float i = 0.; i < 65536.; i++) {
    if (i >= iterLimit) {
      break;
    }
    vec2 sq = pt * pt;
    if (sq.x+sq.y > 16.) {
      gl_FragColor = vec4(vec3(i / iterLimit), 1.);
      return;
    }
    // pt.y = 2. * pt.x * pt.y + pt0.y;
    pt.y = 2. * abs(pt.x*pt.y) - pt0.y;
    pt.x = sq.x - sq.y + pt0.x;
  }

  gl_FragColor = vec4(vec3(0.), 1.);
}
`;
    function onResize() {
        if (!canvas) {
            return;
        }
        canvas.width = document.body.offsetWidth;
        canvas.height = document.body.offsetHeight;
    }
    const vertices = [
        +1., +1.,
        +1., -1.,
        -1., +1.,
        -1., -1.,
    ];
    function compileShaderProgram(gl) {
        // Bundle the shaders
        const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        if (!fragmentShader || !vertexShader) {
            return;
        }
        const program = gl.createProgram();
        gl.attachShader(program, fragmentShader);
        gl.attachShader(program, vertexShader);
        gl.linkProgram(program);
        console.log('Info log:', gl.getProgramInfoLog(program));
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return null;
        }
        return program;
    }
    function onLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            canvas = document.querySelector('canvas');
            onResize();
            const gl = getRenderingContext(canvas);
            if (!gl) {
                return;
            }
            const program = compileShaderProgram(gl);
            gl.useProgram(program);
            // gl.enableVertexAttribArray(0);
            const vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            const coordinates = gl.getAttribLocation(program, 'coordinates');
            gl.vertexAttribPointer(coordinates, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(coordinates);
            const timeValue = gl.getUniformLocation(program, 'time');
            const screenSize = gl.getUniformLocation(program, 'screenSize');
            const center = gl.getUniformLocation(program, 'center');
            const zoomLevelUniform = gl.getUniformLocation(program, 'zoomLevel');
            const iterLimitUniform = gl.getUniformLocation(program, 'iterLimit');
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.uniform1f(zoomLevelUniform, 1);
            function onPointerDown(_evt) { clicked = true; }
            function onPointerUp(_evt) { clicked = false; }
            let centerX = 0, centerY = 0;
            const movementFactor = .002;
            let zoomLevel = 1;
            let iterLimit = 256;
            gl.uniform1f(iterLimitUniform, iterLimit);
            function onPointerMove(evt) {
                if (clicked) {
                    centerX -= evt.movementX / (Math.pow(zoomLevel, 2)) * movementFactor;
                    centerY += evt.movementY / (Math.pow(zoomLevel, 2)) * movementFactor;
                    gl.uniform2f(center, centerX, centerY);
                }
            }
            function onWheel(evt) {
                zoomLevel -= zoomLevel * Math.sign(evt.deltaY) * 0.1;
                if (zoomLevel < 0.5) {
                    zoomLevel = 0.5;
                }
                gl.uniform1f(zoomLevelUniform, zoomLevel);
            }
            function onKeyDown(evt) {
                switch (evt.key) {
                    case '+': {
                        iterLimit *= 2;
                        gl.uniform1f(iterLimitUniform, iterLimit);
                        break;
                    }
                    case '-': {
                        iterLimit /= 2;
                        gl.uniform1f(iterLimitUniform, iterLimit);
                        break;
                    }
                }
            }
            function onAnimationFrame(t) {
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.uniform1f(timeValue, t * 0.01);
                gl.uniform2f(screenSize, canvas.width, canvas.height);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                requestAnimationFrame(onAnimationFrame);
            }
            requestAnimationFrame(onAnimationFrame);
            document.addEventListener('wheel', onWheel);
            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointerleave', onPointerUp);
            document.addEventListener('keydown', onKeyDown);
        });
    }
    window.once('load', onLoad);
    window.addEventListener('resize', onResize);

}());
