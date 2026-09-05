/* Low-resolution volumetric fog for the Seven Days title screen. */
(function(global){
  'use strict';

  const VS=`
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
  `;

  const FS=`
    precision highp float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform float u_seed;

    float hash(vec3 p){
      p=fract(p*.3183099+vec3(.1,.2,.3));
      p*=17.;
      return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
    }

    float noise3(vec3 p){
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.-2.*f);
      float n000=hash(i+vec3(0,0,0));
      float n100=hash(i+vec3(1,0,0));
      float n010=hash(i+vec3(0,1,0));
      float n110=hash(i+vec3(1,1,0));
      float n001=hash(i+vec3(0,0,1));
      float n101=hash(i+vec3(1,0,1));
      float n011=hash(i+vec3(0,1,1));
      float n111=hash(i+vec3(1,1,1));
      float x00=mix(n000,n100,f.x),x10=mix(n010,n110,f.x);
      float x01=mix(n001,n101,f.x),x11=mix(n011,n111,f.x);
      return mix(mix(x00,x10,f.y),mix(x01,x11,f.y),f.z);
    }

    float fbm3(vec3 p){
      float v=0.,a=.55;
      for(int i=0;i<4;i++){
        v+=noise3(p)*a;
        p=p*2.03+vec3(7.1,3.7,5.9);
        a*=.5;
      }
      return v;
    }

    void main(){
      vec2 uv=v_uv*2.-1.;
      vec3 ro=vec3(uv*1.15,-1.6);
      vec3 rd=normalize(vec3(uv*.32,1.0));
      float density=0.;
      float redScatter=0.;
      float t=.12;
      for(int i=0;i<10;i++){
        vec3 p=ro+rd*t;
        p.x+=sin(u_time*.11+p.z*.7)*.12;
        p.y+=cos(u_time*.09+p.z*.5)*.10;
        float n=fbm3(p*1.05+vec3(u_seed*.01,u_time*.045,u_time*.025));
        float d=smoothstep(.48,.90,n);
        density+=d*.13;
        float titleLight=exp(-dot(p.xy,p.xy)*2.4)*exp(-abs(p.z-.7)*1.6);
        redScatter+=d*titleLight*.085;
        t+=.22;
      }
      density=clamp(density,0.,.72);
      vec3 fog=vec3(.32,.34,.36)*density;
      fog+=vec3(.60,.015,.01)*redScatter;
      gl_FragColor=vec4(fog,density*.78+redScatter*.5);
    }
  `;

  class VolumetricFog{
    constructor(options={}){
      this.grid=options.grid??16;
      this.zIndex=options.zIndex??1;
      this.seed=options.seed??Math.random()*1000;
      this.running=false;
      this.startTime=0;
      this.canvas=document.createElement('canvas');
      this.canvas.width=this.grid;
      this.canvas.height=this.grid;
      this.canvas.setAttribute('aria-hidden','true');
      Object.assign(this.canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(this.zIndex),imageRendering:'auto'});
      document.body.appendChild(this.canvas);
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
      if(!this.gl){this.canvas.remove();throw new Error('VolumetricFog requires WebGL');}
      this._frame=this._frame.bind(this);
      this._init();
    }
    _compile(type,src){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||'shader compile failed';gl.deleteShader(s);throw new Error(e);}return s;}
    _init(){
      const gl=this.gl,p=gl.createProgram(),v=this._compile(gl.VERTEX_SHADER,VS),f=this._compile(gl.FRAGMENT_SHADER,FS);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p)||'shader link failed';gl.deleteProgram(p);throw new Error(e);}
      this.program=p;gl.useProgram(p);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const a=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      this.uTime=gl.getUniformLocation(p,'u_time');this.uSeed=gl.getUniformLocation(p,'u_seed');
      gl.viewport(0,0,this.grid,this.grid);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    }
    _frame(ms){if(!this.running)return;if(!this.startTime)this.startTime=ms;const t=(ms-this.startTime)/1000;const gl=this.gl;gl.useProgram(this.program);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(this.uTime,t);gl.uniform1f(this.uSeed,this.seed);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(this._frame);}
    start(){if(this.running)return;this.running=true;this.startTime=0;requestAnimationFrame(this._frame);}
    stop(){this.running=false;}
    destroy(){this.stop();if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);this.canvas.remove();}
  }

  global.VolumetricFog=VolumetricFog;
})(window);
