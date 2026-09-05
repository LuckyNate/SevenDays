/* Coarse 32x32x32 density volume raymarched for the Seven Days title screen. */
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
    uniform sampler2D u_volume;
    uniform float u_time;
    uniform float u_seed;
    uniform vec2 u_resolution;

    float hash(float n){return fract(sin(n)*43758.5453123);}

    float voxel(vec3 p){
      p=clamp(p,0.,.9999);
      vec3 q=p*31.;
      vec3 i=floor(q),f=fract(q);
      f=f*f*(3.-2.*f);
      float slice0=i.z;
      float slice1=min(31.,slice0+1.);
      vec2 xy0=(i.xy+.5)/32.;
      vec2 xy1=(min(i.xy+1.,31.)+.5)/32.;
      vec2 atlas0=vec2((xy0.x+slice0)/32.,xy0.y);
      vec2 atlas0x=vec2((xy1.x+slice0)/32.,xy0.y);
      vec2 atlas0y=vec2((xy0.x+slice0)/32.,xy1.y);
      vec2 atlas0xy=vec2((xy1.x+slice0)/32.,xy1.y);
      vec2 atlas1=vec2((xy0.x+slice1)/32.,xy0.y);
      vec2 atlas1x=vec2((xy1.x+slice1)/32.,xy0.y);
      vec2 atlas1y=vec2((xy0.x+slice1)/32.,xy1.y);
      vec2 atlas1xy=vec2((xy1.x+slice1)/32.,xy1.y);
      float a=mix(mix(texture2D(u_volume,atlas0).r,texture2D(u_volume,atlas0x).r,f.x),mix(texture2D(u_volume,atlas0y).r,texture2D(u_volume,atlas0xy).r,f.x),f.y);
      float b=mix(mix(texture2D(u_volume,atlas1).r,texture2D(u_volume,atlas1x).r,f.x),mix(texture2D(u_volume,atlas1y).r,texture2D(u_volume,atlas1xy).r,f.x),f.y);
      return mix(a,b,f.z);
    }

    void main(){
      vec2 uv=v_uv*2.-1.;
      float aspect=u_resolution.x/max(u_resolution.y,1.);
      uv.x*=aspect;
      vec3 ro=vec3(uv*.48,-.18);
      vec3 rd=normalize(vec3(uv*.10,1.));
      float trans=1.;
      vec3 accum=vec3(0.);
      float t=.20;
      for(int i=0;i<32;i++){
        vec3 p=ro+rd*t;
        vec3 vp=vec3(p.xy+.5,p.z*.44+.18);
        vp.x+=sin(u_time*.13+vp.z*5.)*.035;
        vp.y+=cos(u_time*.10+vp.z*4.)*.025;
        if(vp.x>=0.&&vp.x<=1.&&vp.y>=0.&&vp.y<=1.&&vp.z>=0.&&vp.z<=1.){
          float d=smoothstep(.18,.72,voxel(vp));
          float extinction=d*.18;
          float titleLight=exp(-dot(p.xy*vec2(.82,1.35),p.xy*vec2(.82,1.35))*4.2)*exp(-abs(vp.z-.52)*2.2);
          vec3 scatter=vec3(.24,.26,.28)*d*.11+vec3(.82,.018,.012)*d*titleLight*.18;
          accum+=trans*scatter;
          trans*=1.-extinction;
        }
        t+=.055;
      }
      float alpha=clamp(1.-trans,0.,.86);
      gl_FragColor=vec4(accum,alpha);
    }
  `;

  class VolumetricFog{
    constructor(options={}){
      this.size=options.size??32;
      this.zIndex=options.zIndex??1;
      this.seed=options.seed??Math.random()*1000;
      this.running=false;
      this.startTime=0;
      this.lastVolumeUpdate=-1;
      this.canvas=document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden','true');
      Object.assign(this.canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(this.zIndex),imageRendering:'auto'});
      document.body.appendChild(this.canvas);
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
      if(!this.gl){this.canvas.remove();throw new Error('VolumetricFog requires WebGL');}
      this._frame=this._frame.bind(this);
      this._resize=this.resize.bind(this);
      global.addEventListener('resize',this._resize);
      this._init();
      this.resize();
      this._updateVolume(0);
    }

    _compile(type,src){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||'shader compile failed';gl.deleteShader(s);throw new Error(e);}return s;}

    _init(){
      const gl=this.gl,p=gl.createProgram(),v=this._compile(gl.VERTEX_SHADER,VS),f=this._compile(gl.FRAGMENT_SHADER,FS);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p)||'shader link failed';gl.deleteProgram(p);throw new Error(e);}
      this.program=p;gl.useProgram(p);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const a=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      this.uTime=gl.getUniformLocation(p,'u_time');this.uSeed=gl.getUniformLocation(p,'u_seed');this.uResolution=gl.getUniformLocation(p,'u_resolution');this.uVolume=gl.getUniformLocation(p,'u_volume');
      this.volumeTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.volumeTexture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.uVolume,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    }

    resize(){
      const scale=.5,dpr=Math.min(global.devicePixelRatio||1,2);
      this.canvas.width=Math.max(64,Math.round(global.innerWidth*dpr*scale));
      this.canvas.height=Math.max(64,Math.round(global.innerHeight*dpr*scale));
      this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    }

    _updateVolume(time){
      const s=this.size,w=s*s,h=s,data=new Uint8Array(w*h*4);
      const phase=time*.18;
      for(let z=0;z<s;z++)for(let y=0;y<s;y++)for(let x=0;x<s;x++){
        const nx=x/s,ny=y/s,nz=z/s;
        const a=Math.sin(nx*11.7+phase+nz*4.1);
        const b=Math.sin(ny*9.3-phase*.71+nx*3.7);
        const c=Math.sin(nz*13.1+phase*.43+ny*5.2);
        const d=Math.sin((nx+ny+nz)*17.3-phase*.31);
        const grain=Math.sin((x*12.9898+y*78.233+z*37.719+this.seed)*.13);
        let density=.50+a*.14+b*.13+c*.12+d*.08+grain*.045;
        density=Math.max(0,Math.min(1,(density-.22)*1.42));
        const px=z*s+x,idx=(y*w+px)*4,v=Math.round(density*255);
        data[idx]=v;data[idx+1]=v;data[idx+2]=v;data[idx+3]=255;
      }
      const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.volumeTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    }

    _frame(ms){
      if(!this.running)return;
      if(!this.startTime)this.startTime=ms;
      const t=(ms-this.startTime)/1000;
      if(this.lastVolumeUpdate<0||t-this.lastVolumeUpdate>.12){this._updateVolume(t);this.lastVolumeUpdate=t;}
      const gl=this.gl;gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.volumeTexture);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(this.uTime,t);gl.uniform1f(this.uSeed,this.seed);gl.uniform2f(this.uResolution,this.canvas.width,this.canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(this._frame);
    }

    start(){if(this.running)return;this.running=true;this.startTime=0;this.lastVolumeUpdate=-1;requestAnimationFrame(this._frame);}
    stop(){this.running=false;}
    destroy(){this.stop();global.removeEventListener('resize',this._resize);if(this.volumeTexture)this.gl.deleteTexture(this.volumeTexture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);this.canvas.remove();}
  }

  global.VolumetricFog=VolumetricFog;
})(window);
