#ifdef GL_ES
precision mediump float;
#endif
varying vec2 vTextureCoord;
varying vec4 vNormal;
uniform sampler2D uSampler;
void main() {
  gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
}