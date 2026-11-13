// HORSE RIDER v40 "Stylized" art pipeline.
// Turns the photoreal PBR look into a bright, saturated, hand-painted "battle-royale cartoon" look without re-authoring every
// material: it patches three.js shader chunks globally (so every MeshStandard/Physical material — terrain, horses, rider, town,
// trees, grass, props — picks it up at compile time) and exports the stylized colour grade used as the final post pass.
//   - soft two-tone light ramp (crisp but smooth terminator, like cel shading with the edge blurred)
//   - side rim light on characters/props (suppressed on up-facing ground so the terrain does not glow at grazing angles)
//   - albedo vibrance + slight lift (painted textures are brighter and cleaner than scanned ones)
//   - photo textures sampled with a mip bias + flattened normal maps -> painterly, less noisy surfaces
// ?style=real turns all of it off (the v39 realistic look).
import * as THREE from 'three';

export const STYLE_ON = new URLSearchParams(location.search).get('style') !== 'real';

export const STYLE = { toon: .62, rim: .55, sat: 1.22, lift: .02, bias: .9, nrm: .55 };

if (STYLE_ON) {
  const C = THREE.ShaderChunk;
  C.common = `#define STY_TOON ${STYLE.toon.toFixed(3)}\n#define STY_RIM ${STYLE.rim.toFixed(3)}\n#define STY_SAT ${STYLE.sat.toFixed(3)}\n#define STY_LIFT ${STYLE.lift.toFixed(3)}\n#define STY_BIAS ${STYLE.bias.toFixed(3)}\n#define STY_NRM ${STYLE.nrm.toFixed(3)}\n` + C.common;

  // painterly albedo: photo detail softened by sampling a blurrier mip (lit materials only, so UI sprites / text stay sharp)
  C.map_fragment = C.map_fragment.replace('texture2D( map, vMapUv )', '\n#ifdef STANDARD\ntexture( map, vMapUv, STY_BIAS )\n#else\ntexture2D( map, vMapUv )\n#endif\n');
  // calmer normal maps (stylized surfaces read as big shapes, not micro-detail)
  C.normal_fragment_maps = C.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * STY_NRM;');

  // vibrant albedo just before lighting
  C.lights_physical_fragment = `{ vec3 a = diffuseColor.rgb; float l = dot( a, vec3( .2126, .7152, .0722 ) );
  float mx = max( a.r, max( a.g, a.b ) ), mn = min( a.r, min( a.g, a.b ) ); float vib = 1.0 - smoothstep( .0, .6, ( mx - mn ) / max( mx, 1e-4 ) );
  a = mix( vec3( l ), a, STY_SAT + .25 * vib ); a = max( a, 0.0 ) * ( 1.0 + STY_LIFT * 4.0 ) + STY_LIFT * .25; diffuseColor.rgb = a; }
` + C.lights_physical_fragment;

  // two-tone light ramp + rim light
  C.lights_physical_pars_fragment = C.lights_physical_pars_fragment.replace(
    'vec3 irradiance = dotNL * directLight.color;',
    `float styNL = dot( geometryNormal, directLight.direction );
	vec3 irradiance = dotNL * directLight.color; /* specular keeps the physical term (a toon term here makes GGX fireflies at grazing light) */
	vec3 styIrr = mix( dotNL, smoothstep( -.04, .2, styNL ) * ( .82 + .18 * saturate( styNL ) ), STY_TOON ) * directLight.color;
	{ vec3 upV = normalize( ( viewMatrix * vec4( 0., 1., 0., 0. ) ).xyz ); float side = 1. - abs( dot( geometryNormal, upV ) );
	  float rim = pow( 1. - saturate( dot( geometryNormal, geometryViewDir ) ), 3.5 ) * side * side * smoothstep( -.4, .3, styNL );
	  reflectedLight.directDiffuse += min( rim, 1. ) * directLight.color * material.diffuseColor * STY_RIM * .3; }`)
    .replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );', 'reflectedLight.directDiffuse += styIrr * BRDF_Lambert( material.diffuseColor );');
}

// final grade: vibrance, cool shadows / warm highlights split-tone, gentle S-curve, soft vignette, clean (no grain)
export const STYLE_GRADE = { uniforms: { tDiffuse: { value: null }, uAmt: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt; varying vec2 vUv;
void main(){ vec4 c=texture2D(tDiffuse,vUv); vec3 x=c.rgb; float l=dot(x,vec3(.2126,.7152,.0722));
 float mx=max(x.r,max(x.g,x.b)), mn=min(x.r,min(x.g,x.b)); float s=(mx-mn)/max(mx,1e-4);
 x=mix(vec3(l),x,1.+(.38*(1.-s)+.08)*uAmt);                                       // vibrance: pushes dull colours, spares already-saturated ones
 x*=mix(vec3(.9,.95,1.12),vec3(1.03,1.01,.97),smoothstep(.12,.75,l))*uAmt+(1.-uAmt); // cool blue-violet shadows, warm sunny highlights
 x=mix(x,x*x*(3.-2.*x),.22*uAmt);                                                  // punchy S-curve
 x=max(x,vec3(.018,.022,.04));                                                      // clean, slightly blue blacks
 vec2 d=vUv-.5; x*=1.-dot(d,d)*.22*uAmt; gl_FragColor=vec4(clamp(x,0.,1.),c.a); }` };
