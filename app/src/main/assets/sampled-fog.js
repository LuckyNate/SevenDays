/*
 * Two-layer sampled fog for Seven Days.
 * Requires perlin3d.js to be loaded first.
 *
 * Creates:
 *   back layer  -> behind the SEVEN DAYS lettering
 *   front layer -> closer to the camera / above the lettering
 *
 * The fog is generated from 2D samples through the fixed 3D Perlin field.
 * x/y address the image plane; z is the moving slice through the field.
 */
(function (global) {
  'use strict';

  class SampledFog {
    constructor(options = {}) {
      if (!global.Perlin3D) {
        throw new Error('SampledFog requires perlin3d.js');
      }

      this.scale = options.scale ?? 0.018;
      this.sampleSize = options.sampleSize ?? 5;
      this.octaves = options.octaves ?? 4;
      this.speed = options.speed ?? 0.035;
      this.running = false;
      this.lastTime = 0;
      this.z = options.z ?? 0;

      this.back = this._makeLayer({
        id: options.backId ?? 'fog-back',
        zIndex: options.backZIndex ?? 1,
        opacity: options.backOpacity ?? 0.34,
        threshold: options.backThreshold ?? 0.42,
        softness: options.backSoftness ?? 0.38,
        xOffset: options.backXOffset ?? 0,
        yOffset: options.backYOffset ?? 0,
        zOffset: options.backZOffset ?? 0
      });

      this.front = this._makeLayer({
        id: options.frontId ?? 'fog-front',
        zIndex: options.frontZIndex ?? 3,
        opacity: options.frontOpacity ?? 0.20,
        threshold: options.frontThreshold ?? 0.50,
        softness: options.frontSoftness ?? 0.34,
        xOffset: options.frontXOffset ?? 37.25,
        yOffset: options.frontYOffset ?? -19.5,
        zOffset: options.frontZOffset ?? 91.75
      });

      this._resize = this.resize.bind(this);
      this._frame = this._frame.bind(this);

      global.addEventListener('resize', this._resize);
      this.resize();
    }

    _makeLayer(config) {
      const canvas = document.createElement('canvas');
      canvas.id = config.id;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = String(config.zIndex);
      canvas.style.opacity = String(config.opacity);
      canvas.style.imageRendering = 'auto';

      document.body.appendChild(canvas);

      const sampleCanvas = document.createElement('canvas');

      return {
        ...config,
        canvas,
        ctx: canvas.getContext('2d', { alpha: true }),
        sampleCanvas,
        sampleCtx: sampleCanvas.getContext('2d', { alpha: true }),
        imageData: null
      };
    }

    resize() {
      const width = Math.max(1, global.innerWidth | 0);
      const height = Math.max(1, global.innerHeight | 0);
      const dpr = Math.min(global.devicePixelRatio || 1, 2);

      for (const layer of [this.back, this.front]) {
        layer.canvas.width = Math.round(width * dpr);
        layer.canvas.height = Math.round(height * dpr);

        const sw = Math.max(1, Math.ceil(width / this.sampleSize));
        const sh = Math.max(1, Math.ceil(height / this.sampleSize));
        layer.sampleCanvas.width = sw;
        layer.sampleCanvas.height = sh;
        layer.imageData = layer.sampleCtx.createImageData(sw, sh);
      }
    }

    _density(layer, px, py) {
      const x = (px * this.sampleSize + layer.xOffset) * this.scale;
      const y = (py * this.sampleSize + layer.yOffset) * this.scale;
      const z = this.z + layer.zOffset;

      // FBM is still a 2D image sample: x/y select the pixel and z selects
      // the current slice through the fixed 3D noise volume.
      const n = global.Perlin3D.fbm(x, y, z, this.octaves) * 0.5 + 0.5;
      const d = (n - layer.threshold) / layer.softness;
      return Math.max(0, Math.min(1, d));
    }

    _drawLayer(layer) {
      const image = layer.imageData;
      const data = image.data;
      const w = image.width;
      const h = image.height;
      let p = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let density = this._density(layer, x, y);
          density = density * density * (3 - 2 * density);

          data[p++] = 224;
          data[p++] = 228;
          data[p++] = 230;
          data[p++] = Math.round(density * 255);
        }
      }

      layer.sampleCtx.putImageData(image, 0, 0);

      const ctx = layer.ctx;
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        layer.sampleCanvas,
        0, 0, layer.sampleCanvas.width, layer.sampleCanvas.height,
        0, 0, layer.canvas.width, layer.canvas.height
      );
    }

    draw() {
      this._drawLayer(this.back);
      this._drawLayer(this.front);
    }

    _frame(time) {
      if (!this.running) return;

      if (this.lastTime) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.z += dt * this.speed;
      }
      this.lastTime = time;

      this.draw();
      requestAnimationFrame(this._frame);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = 0;
      requestAnimationFrame(this._frame);
    }

    stop() {
      this.running = false;
      this.lastTime = 0;
    }

    destroy() {
      this.stop();
      global.removeEventListener('resize', this._resize);
      this.back.canvas.remove();
      this.front.canvas.remove();
    }
  }

  global.SampledFog = SampledFog;
})(window);
