"use client";

import { useEffect, useRef, useState } from "react";

const vertexSource = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
// The reference's two-blob signed-distance-field image reveal, without a 3D engine.
const fragmentSource = `precision highp float;
varying vec2 vUv; uniform float uProgress; uniform vec2 uSize; uniform vec2 uImageSize; uniform sampler2D uTexture;
#define PI 3.1415926538
float noise(vec2 p){float a=atan(p.y,p.x)+uProgress*PI;return ((cos(a)+1.)*.5+(sin(2.*a)+1.)*.5+(cos(3.*a)+1.)*.5)/3.;}
float softMin(float a,float b,float k){return -log(exp(-k*a)+exp(-k*b))/k;}
void main(){vec2 uv=vUv;float ca=uSize.x/uSize.y;float ia=uImageSize.x/uImageSize.y;vec2 s=vec2(1.);if(ca>ia)s.y=ia/ca;else s.x=ca/ia;uv=(vUv-.5)*s+.5;
vec2 coords=vUv*uSize;vec2 center=.5*uSize;float rad=pow(uProgress,2.5)*length(uSize);
float circle=length(coords-center)+noise(coords-center)*rad*(.5+sin(uProgress*.2)*.25);
float jitter=fract(sin(311.7)*43758.5453)*.5-.25;float distRatio=.25+.2*fract(sin(0.)*12345.6);vec2 off=vec2(cos(jitter),sin(jitter))*distRatio*min(uSize.x,uSize.y);
float blob=length(coords-center-off)+noise(coords-center-off)*rad*.4;circle=softMin(circle,blob,50./max(uSize.x,uSize.y));
gl_FragColor=mix(vec4(0.),texture2D(uTexture,uv),step(circle,rad));}`;

export function BlobReveal() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const element = canvas.current, container = wrapper.current;
    if (!element || !container) return;
    const gl = element.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) { setFallback(true); return; }
    function shader(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source); gl!.compileShader(shader);
      return shader;
    }
    const program = gl.createProgram()!;
    const vertex = shader(gl.VERTEX_SHADER, vertexSource), fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.useProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setFallback(true); return; }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const size = gl.getUniformLocation(program, "uSize"), progress = gl.getUniformLocation(program, "uProgress");
    let ready = false, value = 0, frame = 0, start = 0, disposed = false;
    const image = new Image();
    function draw() { if (ready && !disposed) { gl!.uniform1f(progress, value); gl!.drawArrays(gl!.TRIANGLES, 0, 6); } }
    function resize() {
      const { width, height } = container!.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 2);
      element!.width = Math.max(1, width * dpr); element!.height = Math.max(1, height * dpr);
      gl!.viewport(0, 0, element!.width, element!.height); gl!.uniform2f(size, width, height); draw();
    }
    function tick(time: number) {
      const elapsed = Math.min(1, (time - start) / 2000);
      value = 1 - Math.pow(1 - elapsed, 3); draw();
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    }
    function check() {
      const rect = container!.getBoundingClientRect();
      if (rect.top > innerHeight) { cancelAnimationFrame(frame); start = 0; value = 0; draw(); }
      else if (ready && rect.top + rect.height / 2 <= innerHeight && rect.bottom >= 0 && !start) {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) { value = 1; draw(); }
        else { start = performance.now(); frame = requestAnimationFrame(tick); }
      }
    }
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform2f(gl.getUniformLocation(program, "uImageSize"), image.width, image.height);
      ready = true; resize(); check();
    };
    image.onerror = () => setFallback(true);
    image.src = "/assets/jYV72WU46UGBxqqCPbW5x6ncic.jpg";
    const observer = new ResizeObserver(resize); observer.observe(container);
    window.addEventListener("scroll", check, { passive: true });
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", check); gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); };
  }, []);
  return <div ref={wrapper} className="voxen-blob" role="img" aria-label="A conversation in the ECHOES podcast studio">
    {fallback ? <img src="/assets/jYV72WU46UGBxqqCPbW5x6ncic.jpg" alt="ECHOES podcast studio" /> : <canvas ref={canvas} aria-hidden="true" />}
  </div>;
}
