import { createShader, getRenderingContext } from './utils';

let canvas: HTMLCanvasElement;
let clicked = false;

EventTarget.prototype.once = function(name, fn, ...args) {
  function handler(evt: Event) {
    if (typeof fn === 'function') {
      fn(evt);
    } else if (fn && typeof fn === 'object') {
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

function compileShaderProgram(gl: WebGLRenderingContext) {
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

async function onLoad() {
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

  function onPointerDown(_evt: PointerEvent) { clicked = true; }
  function onPointerUp(_evt: PointerEvent) { clicked = false; }

  let centerX = 0, centerY = 0;
  const movementFactor = .002;
  let zoomLevel = 1;
  let iterLimit = 256;
  gl.uniform1f(iterLimitUniform, iterLimit);

  function onPointerMove(evt: PointerEvent) {
    if (clicked) {
      centerX -= evt.movementX / (zoomLevel ** 2) * movementFactor;
      centerY += evt.movementY / (zoomLevel ** 2) * movementFactor;
      gl.uniform2f(center, centerX, centerY);
    }
  }

  function onWheel(evt: WheelEvent) {
    zoomLevel -= zoomLevel * Math.sign(evt.deltaY) * 0.1;
    if (zoomLevel < 0.5) {
      zoomLevel = 0.5;
    }
    gl.uniform1f(zoomLevelUniform, zoomLevel);
  }

  function onKeyDown(evt: KeyboardEvent) {
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

  function onAnimationFrame(t: number) {
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
}

window.once('load', onLoad);
window.addEventListener('resize', onResize);
