/* WebGL bloom pass for the live SEVEN DAYS title. */
(function(global){
  'use strict';

  const VS=`
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
  `;

  const FS=`
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_title;
    uniform vec2 u_texel;
    uniform float u_time;

    void main(){
      vec4 core=texture2D(u_title,v_uv);
      float a=0.;
      vec2 t=u_texel;
      a+=texture2D(u_title,v_uv+vec2(-8.*t.x,0.)).a*.05;
      a+=texture2D(u_title,v_uv+vec2(-5.*t.x,0.)).a*.08;
      a+=texture2D(u_title,v_uv+vec2(-3.*t.x,0.)).a*.12;
      a+=texture2D(u_title,v_uv+vec2(-1.*t.x,0.)).a*.16;
      a+=texture2D(u_title,v_uv).a*.18;
      a+=texture2D(u_title,v_uv+vec2(1.*t.x,0.)).a*.16;
      a+=texture2D(u_title,v_uv+vec2(3.*t.x,0.)).a*.12;
      a+=texture2D(u_title,v_uv+vec2(5.*t.x,0.)).a*.08;
      a+=texture2D(u_title,v_uv+vec2(8.*t.x,0.)).a*.05;
      float b=0.;
      b+=texture2D(u_title,v_uv+vec2(0.,-8.*t.y)).a*.05;
      b+=texture2D(u_title,v_uv+vec2(0.,-5.*t.y)).a*.08;
      b+=texture2D(u_title,v_uv+vec2(0.,-3.*t.y)).a*.12;
      b+=texture2D(u_title,v_uv+vec2(0.,-1.*t.y)).a*.16;
      b+=a*.18;
      b+=texture2D(u_title,v_uv+vec2(0.,1.*t.y)).a*.16;
      b+=texture2D(u_title,v_uv+vec2(0.,3.*t.y)).a*.12;
      b+=texture2D(u_title,v_uv+vec2(0.,5.*t.y)).a*.08;
      b+=texture2D(u_title,v_uv+vec2(0.,8.*t.y)).a*.05;
      float pulse=.92+.08*sin(u_time*.7);
      float glow=clamp(max(a,b)*pulse,0.,1.);
      vec3 red=vec3(.95,.01,.005);
      gl_FragColor=vec4(red*glow,glow*.72);
    }
  `;

  class TitleBloom{
    constructor(element,options={}){
      this.element=element;
      this.zIndex=options.zIndex??1;
      this.running=false;
      this.startTime=0;
      this.canvas=document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden','true');
      Object.assign(this.canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(this.zIndex)});
      document.body.appendChild(this.canvas);
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
      if(!this.gl){this.canvas.remove();throw new Error('TitleBloom requires WebGL');}
      this._frame=this._frame.bind(this);this._resize=this.resize.bind(this);
      global.addEventListener('resize',this._resize);
      this._init();this.resize();this.capture();
    }
    _compile(type,src){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||'shader compile failed';gl.deleteShader(s);throw new Error(e);}return s;}
    _init(){
      const gl=this.gl,p=gl.createProgram(),v=this._compile(gl.VERTEX_SHADER,VS),f=this._compile(gl.FRAGMENT_SHADER,FS);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p)||'shader link failed';gl.deleteProgram(p);throw new Error(e);}
      this.program=p;gl.useProgram(p);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      this.uTitle=gl.getUniformLocation(p,'u_title');this.uTexel=gl.getUniformLocation(p,'u_texel');this.uTime=gl.getUniformLocation(p,'u_time');
      this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(this.uTitle,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.clearColor(0,0,0,0);
    }
    resize(){const dpr=Math.min(global.devicePixelRatio||1,2),w=Math.max(1,Math.round(global.innerWidth*dpr)),h=Math.max(1,Math.round(global.innerHeight*dpr));this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);this.capture();}
    capture(){
      if(!this.element||!this.gl)return;
      const dpr=Math.min(global.devicePixelRatio||1,2),w=Math.max(1,global.innerWidth|0),h=Math.max(1,global.innerHeight|0),style=getComputedStyle(this.element);
      const c=document.createElement('canvas');c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      for(const span of this.element.querySelectorAll('span')){const r=span.getBoundingClientRect(),text=span.textContent||'',m=ctx.measureText(text),ascent=m.actualBoundingBoxAscent||parseFloat(style.fontSize)*.8,descent=m.actualBoundingBoxDescent||parseFloat(style.fontSize)*.2,baseline=r.top+(r.height+ascent-descent)*.5;ctx.fillText(text,r.left+r.width*.5,baseline);}
      const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    }
    _frame(ms){if(!this.running)return;if(!this.startTime)this.startTime=ms;const gl=this.gl;gl.useProgram(this.program);gl.clear(gl.COLOR_BUFFER_BIT);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform2f(this.uTexel,1/this.canvas.width,1/this.canvas.height);gl.uniform1f(this.uTime,(ms-this.startTime)/1000);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(this._frame);}
    start(){if(this.running)return;this.running=true;this.startTime=0;requestAnimationFrame(this._frame);}
    stop(){this.running=false;}
    destroy(){this.stop();global.removeEventListener('resize',this._resize);if(this.texture)this.gl.deleteTexture(this.texture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);this.canvas.remove();}
  }

  global.TitleBloom=TitleBloom;
})(window);
