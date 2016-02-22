#ifdef GL_ES
precision mediump float;
#endif
varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 v;
uniform sampler2D uSampler;


// Light source direction in eye space (i.e. eye is at (0, 0, 0))
uniform vec4 dirLightSourceDirection;

uniform vec4 dirDiffuseLightIntensity;
uniform vec4 dirSpecularLightIntensity;
uniform vec4 dirAmbientLightIntensity;

uniform vec4 dirLightSourceDirection2;

uniform vec4 dirDiffuseLightIntensity2;
uniform vec4 dirSpecularLightIntensity2;
uniform vec4 dirAmbientLightIntensity2;

// Surface Material properties
uniform vec4 Kambient;
uniform vec4 Kdiffuse;
uniform vec4 Kspecular;
uniform float shininess;

void main() {
    // Light source directional light
    // Now calculate the parameters for the lighting equation:
    // color = Ka * Lag + (Ka * La) + attenuation * ((Kd * (N dot L) * Ld) + (Ks * ((N dot HV) ^ shininess) * Ls))
    // Ka, Kd, Ks: surface material properties
    // Lag: global ambient light (not used in this example)
    // La, Ld, Ls: ambient, diffuse, and specular components of the light source
    // N: normal
    // L: light vector
    // HV: half vector
    // shininess

    // directional light source (position is the direction)
    vec3 lightVector1 = normalize(dirLightSourceDirection.xyz);
    vec3 lightVector2 = normalize(dirLightSourceDirection2.xyz);

    //calculate Diffuse Color
    float NdotL1 = max(dot(vNormal, lightVector1), 0.0);
    float NdotL2 = max(dot(vNormal, lightVector2), 0.0);

    vec4 diffuseColor1 = Kdiffuse * dirDiffuseLightIntensity * NdotL1;
    vec4 diffuseColor2 = Kdiffuse * dirDiffuseLightIntensity2 * NdotL2;


    // calculate Specular color. Here we use the original Phong illumination model.
    vec3 v1 = normalize(v);
    vec3 hv = (v1 + lightVector1)*0.5; // half vector
    vec3 hv2 = (v1 + lightVector2)*0.5; // half vector

    float VdotHV = max(dot(v1,hv),0.0);
    float VdotHV2 = max(dot(v1,hv2),0.0);

    vec4 specularColor1 = Kspecular * dirSpecularLightIntensity * pow(VdotHV,shininess);
    vec4 specularColor2 = Kspecular * dirSpecularLightIntensity2 * pow(VdotHV2,shininess);

    // part of color from directional light
    vec4 color1 = Kambient * dirAmbientLightIntensity + specularColor1 + diffuseColor1;
    vec4 color2 = Kambient * dirAmbientLightIntensity2 + specularColor2 + diffuseColor2;
    vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
    gl_FragColor = mix(color1 + color2, textureColor, 0.4);
}