/*
 * Reusable procedural blood-melt overlay for Seven Days.
 * Standalone side module: nothing is mounted until BloodMelt is constructed.
 *
 * Usage:
 *   const melt = new BloodMelt({ color: '#cc0000', duration: 3400 });
 *   melt.start({ onComplete: () => melt.destroy() });
 *
 * The fragment shader keeps the red layer connected as one viscous sheet,
 * adds a few faster gravity channels, and rounds/softens the moving edge.
 */
(function (global) {
  'use strict';

  const VERTEX_SHADER = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;

    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_progress;
    uniform float u_seed;
    uniform vec3 u_color;

    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i.x + i.y * 57.0 + u_seed * 13.17);
      float b = hash(i.x + 1.0 + i.y * 57.0 + u_seed * 13.17);
      float c = hash(i.x + (i.y + 1.0) * 57.0 + u_seed * 13.17);
      float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0 + u_seed * 13.17);

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 5; i++) {
        value += noise(p) * amp;
        p = p * 2.03 + vec2(19.17, 7.31);
        amp *= 0.5;
      }
      return value;
    }

    float channelField(float x) {
      float broad = fbm(vec2(x * 3.0 + u_seed, u_seed * 0.21));
      float fine = fbm(vec2(x * 10.0 - u_seed * 0.37, 8.0 + u_seed));
      float channel = smoothstep(0.63, 0.86, broad * 0.72 + fine * 0.28);
      return channel;
    }

    void main() {
      vec2 uv = v_uv;
      float aspect = u_resolution.x / max(u_resolution.y, 1.0);

      // Progress begins with a nearly solid sheet, then gravity pulls the
      // connected lower boundary down and offscreen.
      float p = smoothstep(0.0, 1.0, u_progress);

      float x = uv.x * aspect;
      float broad = fbm(vec2(x * 2.2 + u_seed * 0.11, u_seed * 0.37));
      float medium = fbm(vec2(x * 6.0 - u_seed * 0.09, 13.0 + u_seed));
      float channels = channelField(x);

      // Main connected liquid-sheet boundary. Early in the animation the
      // boundary remains near the bottom. It then drops continuously.
      float baseBoundary = 1.08 - p * 2.05;
      float sag = (broad - 0.5) * 0.22 + (medium - 0.5) * 0.08;

      // Sparse channels drain farther/faster, creating long blood fingers.
      float channelPull = channels * (0.18 + p * 0.70);
      float boundary = baseBoundary + sag - channelPull;

      // Slight vertical distortion prevents a mathematically flat liquid edge.
      float edgeNoise = fbm(vec2(x * 9.0, uv.y * 3.0 + u_seed));
      boundary += (edgeNoise - 0.5) * 0.035;

      // Red remains above the moving boundary. Smooth edge gives rounded wet
      // tips instead of rectangular strip endings.
      float edgeSoftness = 0.018;
      float mask = smoothstep(boundary - edgeSoftness, boundary + edgeSoftness, uv.y);

      // Bulb the strongest channels near their tips.
      float bulbStrength = channels * smoothstep(0.08, 0.55, p) * (1.0 - smoothstep(0.82, 1.0, p));
      float localTip = abs(uv.y - (boundary - 0.035));
      float bulb = bulbStrength * smoothstep(0.075, 0.0, localTip);
      mask = max(mask, bulb);

      // Wetness variation is intentionally subtle so it still reads as blood,
      // not glossy plastic.
      float wet = 0.90 + fbm(vec2(uv.x * 7.0, uv.y * 5.0 + u_seed)) * 0.10;
      vec3 color = u_color * wet;

      gl_FragColor = vec4(color, clamp(mask, 0.0, 1.0));
    }
  `;

  function parseColor(value) {
    const hex = String(value || '#cc0000').replace('#', '');
    const full = hex.length === 3
      ? hex.split('').map(ch => ch + ch).join('')
      : hex.padEnd(6, '0').slice(0, 6);
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255
    ];
  }

  class BloodMelt {
    constructor(options = {}) {
      this.duration = options.duration ?? 3400;
      this.color = parseColor(options.color ?? '#cc0000');
      this.seed = options.seed ?? Math.random() * 1000;
      this.zIndex = options.zIndex ?? 20;
      this.running = false;
      this.startTime = 0;
      this.onComplete = null;

      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.style.position = 'fixed';
      this.canvas.style.inset = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = String(this.zIndex);
      this.canvas.style.background = 'transparent';

      document.body.appendChild(this.canvas);

      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false
      });

      if (!this.gl) {
        this.canvas.remove();
        throw new Error('BloodMelt requires WebGL');
      }

      this._frame = this._frame.bind(this);
      this._resize = this.resize.bind(this);
      global.addEventListener('resize', this._resize);

      this._initGl();
      this.resize();
      this.draw(0);
    }

    _compile(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'shader compile failed';
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    _initGl() {
      const gl = this.gl;
      const program = gl.createProgram();
      const vertex = this._compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = this._compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'shader link failed';
        gl.deleteProgram(program);
        throw new Error(message);
      }

      this.program = program;
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.buffer = buffer;

      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      this.uniforms = {
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        progress: gl.getUniformLocation(program, 'u_progress'),
        seed: gl.getUniformLocation(program, 'u_seed'),
        color: gl.getUniformLocation(program, 'u_color')
      };

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    }

    resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(global.innerWidth * dpr));
      const height = Math.max(1, Math.round(global.innerHeight * dpr));

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      this.gl.viewport(0, 0, width, height);
    }

    draw(progress) {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.progress, Math.max(0, Math.min(1, progress)));
      gl.uniform1f(this.uniforms.seed, this.seed);
      gl.uniform3f(this.uniforms.color, this.color[0], this.color[1], this.color[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    start(options = {}) {
      if (this.running) return;
      this.running = true;
      this.startTime = 0;
      this.onComplete = options.onComplete ?? null;
      if (options.seed != null) this.seed = options.seed;
      requestAnimationFrame(this._frame);
    }

    _frame(time) {
      if (!this.running) return;
      if (!this.startTime) this.startTime = time;

      const progress = Math.min(1, (time - this.startTime) / this.duration);
      this.draw(progress);

      if (progress < 1) {
        requestAnimationFrame(this._frame);
        return;
      }

      this.running = false;
      const done = this.onComplete;
      this.onComplete = null;
      if (typeof done === 'function') done();
    }

    reset(seed = Math.random() * 1000) {
      this.running = false;
      this.startTime = 0;
      this.seed = seed;
      this.draw(0);
    }

    stop() {
      this.running = false;
      this.startTime = 0;
    }

    destroy() {
      this.stop();
      global.removeEventListener('resize', this._resize);
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
      this.canvas.remove();
    }
  }

  global.BloodMelt = BloodMelt;
})(window);
