#version 330 core

#define MAX_STEPS 2000
#define SURF_DIST .01
#define MAX_DIST 1000.0
#define REFLECTIVITY .4

#define MAX_REFLECTIONS 3

in vec4 vertexColor;
in vec2 uv;

out vec4 fragColor;

uniform float u_Time;
uniform float u_HperW;

uniform mat4 u_ModelMatrix_view;
uniform float u_px;
uniform float u_pz;

//---------------------
float GetDist(vec3 p);
float RayMarch(vec3 ro, vec3 rd);
float GetLight(vec3 p);
vec3 GetNormal(vec3 p);
float GetRefl(vec3 p, vec3 o);
float GetLightAndRefl(vec3 p, vec3 ro);
//---------------------

// polynomial smooth min (k = 0.1);
float smin( float a, float b) {
	float k = 1.0;
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float sphere(vec3 p, vec4 sphere) {
	float dS = length(p-sphere.xyz) - sphere.w;
	return dS;
}

float infinite_sphere(vec3 p, vec4 sphere) {
	float dS = length(mod(p, 13)-sphere.xyz) - sphere.w;
	return dS;
}

float plane(vec3 p) {
	float dP = p.y;
	return dP;
}

float box(vec3 p, vec3 s) {
	return length(max(abs(p)-s, 0.));
}

vec3 GetNormal(vec3 p) {
	float d = GetDist(p);
	vec2 e = vec2(.01, 0);
	vec3 n = d - vec3(
		GetDist(p-e.xyy),
		GetDist(p-e.yxy),
		GetDist(p-e.yyx));

	return normalize(n);
}

float GetLight(vec3 p) {
	vec3 lightPos = vec3(0,10, 6);
	lightPos.xz += vec2(25*sin(u_Time/4), 25*cos(u_Time/4));
	vec3 l = normalize(lightPos - p);
	vec3 n = GetNormal(p);

	float dif = clamp(dot(n, l), 0, 1);
	float d = RayMarch(p + n * SURF_DIST * 14.0, l);
	if(d < length(lightPos - p)) dif *= 0.3;
	return dif;
}

float GetRefl(vec3 p, vec3 o) {
	
	p += GetNormal(p)*SURF_DIST*14.;
	vec3 ro = o;
	vec3 n = GetNormal(p);
	vec3 v = p - ro;
	float s = dot(n,v);
    
	vec3 r = normalize(v - 2. * s * n);
    
	float d = RayMarch(p,r);
	float b = GetLight(p+r*d);

    return b;
}

float GetDist(vec3 p) {
	float d1 = plane(p);
	float d2 = sphere(p, vec4(3, 1.5, 8, 1.0));
	float d3 = sphere(p, vec4(1, 1.5 + sin(u_Time)*1.5, 8, 0.65));

	float db1 = box(p-vec3(-1.9, 2, 14), vec3(.6, 2, .7));
	
	float dm = smin(d1, db1);
	dm = min(dm, d2);
	dm = min(dm, d3);

	return dm;
}

float GetLightAndRefl(vec3 p, vec3 ro) {
	float diff = GetLight(p);
	float refl = GetRefl(p, ro);
	return diff*(1-REFLECTIVITY) + refl*REFLECTIVITY;
}

float RayMarch(vec3 ro, vec3 rd) {
	float dO = 0;
	for(int i = 0; i < MAX_STEPS; i++) {
		vec3 p = ro + dO*rd;
		float dS = GetDist(p);
		dO += dS;
		if(dS < SURF_DIST || dO > MAX_DIST) break;
	}

	return dO;
}

vec4 scanLineIntensity(float uv, float resolution, float opacity) {
     float intensity = sin(uv * resolution * 3.1415 * 2.0);
     intensity = ((0.5 * intensity) + 0.5) * 0.9 + 0.1;
     return vec4(vec3(pow(intensity, opacity)), 1.0);
}

void main() {
	vec3 col = vec3(0);
	
	vec3 rd = normalize(vec4((vec4(vec3(uv.x, uv.y * u_HperW, 1), 1.) * u_ModelMatrix_view)).xyz);
	vec3 ro = vec3(0 + u_px, 3, 0 + u_pz);
	float d = RayMarch(ro, rd);
	vec3 p = ro + rd * d;

	//float dif = GetLight(p);
	float c = GetLightAndRefl(p, ro);
	col = vec3(c);

	//col *= scanLineIntensity(uv.x + sin(u_Time), 1440, 0.6).xyz;
    //col *= scanLineIntensity(uv.y, 2560, 0.3).xyz;
	

	fragColor = vec4(col, 1.0) * vertexColor * 2.;// + 0.3 *vec4(sin(u_Time)/3, cos(u_Time)/5, sin(u_Time)/3, 1.0);
}