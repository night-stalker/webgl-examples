attribute vec4 a_Position;
attribute vec4 a_Normal;
attribute vec2 a_TextureCoord;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 v;
void main() {
    gl_Position = u_MvpMatrix * a_Position;
    vTextureCoord = a_TextureCoord;
    vNormal = normalize((u_NormalMatrix * a_Normal).xyz);
    v = gl_Position.xyz;
}
