(function () {
  "use strict";
  // Portable GPU post-processing. This is neither DLSS nor ray tracing.
  class Lighting {
    constructor(source) {
      this.source = source;
      this.enabled = true;
      this.night = false;
      this.available = false;
      this.output = document.createElement("canvas");
      this.output.id = "lighting";
      this.output.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
      source.after(this.output);
      const gl = this.output.getContext("webgl2", {
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
      if (!gl) {
        this.output.hidden = true;
        return;
      }
      this.gl = gl;
      const vertex = `#version 300 es
 in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
      const fragment = `#version 300 es
 precision mediump float;in vec2 uv;out vec4 color;uniform sampler2D scene;uniform vec2 px;uniform float night;uniform float time;
 vec3 bright(vec2 q){vec3 c=texture(scene,q).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-.66);}
 void main(){vec2 q=vec2(uv.x,1.-uv.y);vec3 c=texture(scene,q).rgb;vec3 bloom=vec3(0.);bloom+=bright(q+px*vec2(-3.,0.));bloom+=bright(q+px*vec2(3.,0.));bloom+=bright(q+px*vec2(0.,-3.));bloom+=bright(q+px*vec2(0.,3.));bloom+=bright(q+px*vec2(-6.,-6.));bloom+=bright(q+px*vec2(6.,6.));bloom+=bright(q+px*vec2(-6.,6.));bloom+=bright(q+px*vec2(6.,-6.));c+=bloom*.14;float v=1.-.14*dot(uv-.5,uv-.5);c*=v;c=mix(c,c*vec3(.56,.69,.87),night);c=pow(max(c,vec3(0.)),vec3(.97));c=(c-.5)*1.07+.5;color=vec4(clamp(c,0.,1.),1.);}`;
      const shader = (type, src) => {
        let s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      try {
        this.program = gl.createProgram();
        gl.attachShader(this.program, shader(gl.VERTEX_SHADER, vertex));
        gl.attachShader(this.program, shader(gl.FRAGMENT_SHADER, fragment));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
          throw Error("光影着色器链接失败");
        gl.useProgram(this.program);
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const p = gl.getAttribLocation(this.program, "p");
        gl.enableVertexAttribArray(p);
        gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.available = true;
      } catch (e) {
        console.warn("GPU 光影不可用，保留标准渲染", e.message);
        this.output.hidden = true;
      }
      this.output.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.available = false;
        this.output.hidden = true;
      });
      this.output.addEventListener("webglcontextrestored", () => {
        location.reload();
      });
    }
    draw(time) {
      if (!this.available || !this.enabled) {
        this.output.hidden = true;
        return;
      }
      this.output.hidden = false;
      const gl = this.gl,
        w = this.source.width,
        h = this.source.height;
      if (this.output.width !== w || this.output.height !== h) {
        this.output.width = w;
        this.output.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.useProgram(this.program);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.source,
      );
      gl.uniform2f(gl.getUniformLocation(this.program, "px"), 1 / w, 1 / h);
      gl.uniform1f(
        gl.getUniformLocation(this.program, "night"),
        this.night ? 1 : 0,
      );
      gl.uniform1f(gl.getUniformLocation(this.program, "time"), time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
  window.WarLighting = Lighting;
})();
