/* Reusable procedural blood-melt overlay for Seven Days. */
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
    uniform sampler2D u_adhesion;
    uniform float u_hasAdhesion;
    uniform float u_edgeAdhesion;
    uniform float u_dripCount;
    uniform vec2 u_drip0;
    uniform vec2 u_drip1;

    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.0-2.0*f);
      float a=hash(i.x+i.y*57.0+u_seed*13.17);
      float b=hash(i.x+1.0+i.y*57.0+u_seed*13.17);
      float c=hash(i.x+(i.y+1.0)*57.0+u_seed*13.17);
      float d=hash(i.x+1.0+(i.y+1.0)*57.0+u_seed*13.17);
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
    }

    float fbm(vec2 p) {
      float value=0.0, amp=0.5;
      for(int i=0;i<5;i++){
        value+=noise(p)*amp;
        p=p*2.03+vec2(19.17,7.31);
        amp*=0.5;
      }
      return value;
    }

    float channelField(float x) {
      float broad=fbm(vec2(x*8.0+u_seed,u_seed*0.21));
      float fine=fbm(vec2(x*28.0-u_seed*0.37,8.0+u_seed));
      return smoothstep(0.60,0.84,broad*0.68+fine*0.32);
    }

    float titleAdhesion(vec2 uv) {
      if(u_hasAdhesion<0.5)return 0.0;
      vec2 px=vec2(1.0)/max(u_resolution,vec2(1.0));
      vec2 d1=px*5.0, d2=px*11.0;
      float a=texture2D(u_adhesion,uv).a;
      a=max(a,texture2D(u_adhesion,uv+vec2(d1.x,0.0)).a);
      a=max(a,texture2D(u_adhesion,uv-vec2(d1.x,0.0)).a);
      a=max(a,texture2D(u_adhesion,uv+vec2(0.0,d1.y)).a);
      a=max(a,texture2D(u_adhesion,uv-vec2(0.0,d1.y)).a);
      float halo=texture2D(u_adhesion,uv+vec2(d2.x,0.0)).a;
      halo=max(halo,texture2D(u_adhesion,uv-vec2(d2.x,0.0)).a);
      halo=max(halo,texture2D(u_adhesion,uv+vec2(0.0,d2.y)).a);
      halo=max(halo,texture2D(u_adhesion,uv-vec2(0.0,d2.y)).a);
      return max(a,halo*0.55);
    }

    float oneLetterDrip(vec2 uv, vec2 anchor, float index, float p) {
      float start=0.58+hash(u_seed*2.71+index*11.9)*0.10;
      float life=smoothstep(start,start+0.08,p)*(1.0-smoothstep(0.91,0.995,p));
      float longTear=step(0.70,hash(u_seed*5.93+index*23.1));
      float maxLength=mix(0.10,0.20,hash(u_seed*6.73+index*13.1));
      maxLength=mix(maxLength,0.34,longTear);
      float length=maxLength*smoothstep(start,0.88,p);
      float width=mix(0.0025,0.0055,hash(u_seed*9.17+index*7.3));
      float wobble=(fbm(vec2(anchor.x*35.0,u_seed+index))-0.5)*0.014;
      float x=anchor.x+wobble*(1.0-smoothstep(start,0.92,p));
      float dx=abs(uv.x-x);
      float bottom=anchor.y-length;
      float vertical=step(bottom,uv.y)*step(uv.y,anchor.y);
      float streak=(1.0-smoothstep(width,width*2.2,dx))*vertical;
      float tip=smoothstep(width*4.5,0.0,length(vec2((uv.x-x)*1.25,uv.y-bottom)));
      return max(streak,tip)*life;
    }

    float sparseLetterDrips(vec2 uv,float p) {
      float drip=0.0;
      if(u_dripCount>0.5)drip=max(drip,oneLetterDrip(uv,u_drip0,0.0,p));
      if(u_dripCount>1.5)drip=max(drip,oneLetterDrip(uv,u_drip1,1.0,p));
      return drip;
    }

    void main() {
      vec2 uv=v_uv;
      float aspect=u_resolution.x/max(u_resolution.y,1.0);
      float p=smoothstep(0.0,1.0,u_progress);
      float x=uv.x*aspect;
      float broad=fbm(vec2(x*5.5+u_seed*0.11,u_seed*0.37));
      float medium=fbm(vec2(x*16.0-u_seed*0.09,13.0+u_seed));
      float channels=channelField(x);
      float baseBoundary=1.08-p*2.05;
      float sag=(broad-0.5)*0.16+(medium-0.5)*0.07;
      float channelPull=channels*(0.10+p*0.48);
      float boundary=baseBoundary-channelPull+sag;
      float edgeNoise=fbm(vec2(x*24.0,uv.y*5.0+u_seed));
      boundary+=(edgeNoise-0.5)*0.025;

      float edgeDist=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
      float frameStick=1.0-smoothstep(0.0,0.075,edgeDist);
      float glyphStick=titleAdhesion(uv);
      float release=1.0-smoothstep(0.84,1.0,p);
      boundary+=(glyphStick*0.12+frameStick*u_edgeAdhesion)*release;

      float mask=1.0-smoothstep(boundary-0.014,boundary+0.014,uv.y);
      float bulbStrength=channels*smoothstep(0.10,0.60,p)*(1.0-smoothstep(0.88,1.0,p));
      float localTip=abs(uv.y-(boundary+0.020));
      mask=max(mask,bulbStrength*smoothstep(0.050,0.0,localTip));
      mask=max(mask,sparseLetterDrips(uv,p));

      float wet=0.90+fbm(vec2(uv.x*15.0,uv.y*8.0+u_seed))*0.10;
      gl_FragColor=vec4(u_color*wet,clamp(mask,0.0,1.0));
    }
  `;

  function parseColor(value) {
    const hex=String(value||'#cc0000').replace('#','');
    const full=hex.length===3?hex.split('').map(ch=>ch+ch).join(''):hex.padEnd(6,'0').slice(0,6);
    return [parseInt(full.slice(0,2),16)/255,parseInt(full.slice(2,4),16)/255,parseInt(full.slice(4,6),16)/255];
  }

  class BloodMelt {
    constructor(options={}) {
      this.duration=options.duration??5600;
      this.color=parseColor(options.color??'#cc0000');
      this.seed=options.seed??Math.random()*1000;
      this.zIndex=options.zIndex??20;
      this.edgeAdhesion=options.edgeAdhesion??0.20;
      this.adhesionCanvas=options.adhesionCanvas??null;
      this.dripPoints=(options.dripPoints||[]).slice(0,2);
      this.running=false;
      this.startTime=0;
      this.onComplete=null;
      this.canvas=document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden','true');
      Object.assign(this.canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(this.zIndex),background:'transparent'});
      document.body.appendChild(this.canvas);
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
      if(!this.gl){this.canvas.remove();throw new Error('BloodMelt requires WebGL');}
      this._frame=this._frame.bind(this);
      this._resize=this.resize.bind(this);
      global.addEventListener('resize',this._resize);
      this._initGl();
      this.resize();
      this.draw(0);
    }

    _compile(type,source){
      const gl=this.gl,shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        const message=gl.getShaderInfoLog(shader)||'shader compile failed';
        gl.deleteShader(shader);throw new Error(message);
      }
      return shader;
    }

    _initGl(){
      const gl=this.gl,program=gl.createProgram();
      const vertex=this._compile(gl.VERTEX_SHADER,VERTEX_SHADER);
      const fragment=this._compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER);
      gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
        const message=gl.getProgramInfoLog(program)||'shader link failed';
        gl.deleteProgram(program);throw new Error(message);
      }
      this.program=program;gl.useProgram(program);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'a_position');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      this.uniforms={
        resolution:gl.getUniformLocation(program,'u_resolution'),
        progress:gl.getUniformLocation(program,'u_progress'),
        seed:gl.getUniformLocation(program,'u_seed'),
        color:gl.getUniformLocation(program,'u_color'),
        adhesion:gl.getUniformLocation(program,'u_adhesion'),
        hasAdhesion:gl.getUniformLocation(program,'u_hasAdhesion'),
        edgeAdhesion:gl.getUniformLocation(program,'u_edgeAdhesion'),
        dripCount:gl.getUniformLocation(program,'u_dripCount'),
        drip0:gl.getUniformLocation(program,'u_drip0'),
        drip1:gl.getUniformLocation(program,'u_drip1')
      };
      this.adhesionTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.adhesionTexture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      if(this.adhesionCanvas)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.adhesionCanvas);
      else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
      gl.uniform1i(this.uniforms.adhesion,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    }

    resize(){
      const dpr=Math.min(global.devicePixelRatio||1,2);
      const width=Math.max(1,Math.round(global.innerWidth*dpr));
      const height=Math.max(1,Math.round(global.innerHeight*dpr));
      if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
      this.gl.viewport(0,0,width,height);
    }

    draw(progress){
      const gl=this.gl;
      gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.adhesionTexture);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(this.uniforms.resolution,this.canvas.width,this.canvas.height);
      gl.uniform1f(this.uniforms.progress,Math.max(0,Math.min(1,progress)));
      gl.uniform1f(this.uniforms.seed,this.seed);
      gl.uniform3f(this.uniforms.color,this.color[0],this.color[1],this.color[2]);
      gl.uniform1f(this.uniforms.hasAdhesion,this.adhesionCanvas?1:0);
      gl.uniform1f(this.uniforms.edgeAdhesion,this.edgeAdhesion);
      gl.uniform1f(this.uniforms.dripCount,this.dripPoints.length);
      const p0=this.dripPoints[0]||[0,0],p1=this.dripPoints[1]||[0,0];
      gl.uniform2f(this.uniforms.drip0,p0[0],p0[1]);
      gl.uniform2f(this.uniforms.drip1,p1[0],p1[1]);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }

    start(options={}){if(this.running)return;this.running=true;this.startTime=0;this.onComplete=options.onComplete??null;if(options.seed!=null)this.seed=options.seed;requestAnimationFrame(this._frame);}
    _frame(time){if(!this.running)return;if(!this.startTime)this.startTime=time;const progress=Math.min(1,(time-this.startTime)/this.duration);this.draw(progress);if(progress<1)return requestAnimationFrame(this._frame);this.running=false;const done=this.onComplete;this.onComplete=null;if(typeof done==='function')done();}
    reset(seed=Math.random()*1000){this.running=false;this.startTime=0;this.seed=seed;this.draw(0);}
    stop(){this.running=false;this.startTime=0;}
    destroy(){this.stop();global.removeEventListener('resize',this._resize);if(this.adhesionTexture)this.gl.deleteTexture(this.adhesionTexture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);this.adhesionCanvas=null;this.dripPoints=[];this.canvas.remove();}
  }

  global.BloodMelt=BloodMelt;
})(window);
