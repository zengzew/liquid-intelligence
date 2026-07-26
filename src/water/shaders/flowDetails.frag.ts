const flowDetailsFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;

  varying float vAcross;
  varying float vLongitudinal;

  float hash21(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float noise21(vec2 value) {
    vec2 index = floor(value);
    vec2 fraction = fract(value);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);

    float a = hash21(index);
    float b = hash21(index + vec2(1.0, 0.0));
    float c = hash21(index + vec2(0.0, 1.0));
    float d = hash21(index + vec2(1.0, 1.0));

    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
  }

  float fbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 3; octave++) {
      result += amplitude * noise21(value);
      value = value * 2.04 + vec2(11.7, 7.9);
      amplitude *= 0.5;
    }

    return result;
  }

  void main() {
    float movingNoise = fbm(vec2(
      vLongitudinal * 12.0 - uTime * 0.1,
      vAcross * 2.1 + uTime * 0.008
    ));
    float drift =
      sin(vLongitudinal * 16.0 - uTime * 0.14) * 0.055 +
      (movingNoise - 0.5) * 0.25;
    float streamCoordinate = vAcross + drift;
    float mainFilaments = pow(
      0.5 +
        0.5 *
          sin(
            streamCoordinate * 22.0 +
            movingNoise * 5.8 +
            vLongitudinal * 1.3
          ),
      26.0
    );
    float fineFilaments = pow(
      0.5 +
        0.5 *
          sin(
            streamCoordinate * 35.0 -
            movingNoise * 4.6 -
            vLongitudinal * 2.2
          ),
      32.0
    );
    float segmentNoise = fbm(vec2(
      vLongitudinal * 29.0 - uTime * 0.2,
      streamCoordinate * 3.1
    ));
    float broken = smoothstep(0.47, 0.68, segmentNoise);
    float secondaryBreak = smoothstep(
      0.55,
      0.74,
      noise21(vec2(
        vLongitudinal * 21.0 - uTime * 0.13,
        streamCoordinate * 4.7
      ))
    );
    float longitudinalBreak = smoothstep(
      0.58,
      0.8,
      noise21(vec2(
        vLongitudinal * 47.0 - uTime * 0.18,
        streamCoordinate * 7.1
      ))
    );
    float fineBreak = smoothstep(
      0.56,
      0.78,
      noise21(vec2(
        vLongitudinal * 61.0 + uTime * 0.11,
        streamCoordinate * 9.3 + 0.37
      ))
    );
    float softCurrent =
      exp(-pow((streamCoordinate - 0.16) / 0.14, 2.0)) *
      smoothstep(
        0.42,
        0.7,
        fbm(vec2(
          vLongitudinal * 8.0 - uTime * 0.065,
          streamCoordinate * 1.7
        ))
      );
    float downstream = smoothstep(0.04, 0.48, vLongitudinal);
    float currents =
      (
        mainFilaments * broken * longitudinalBreak * 0.82 +
        fineFilaments * secondaryBreak * fineBreak * 0.52 +
        softCurrent * longitudinalBreak * 0.18
      ) *
      mix(0.32, 1.0, downstream);

    float edgeDistance = 1.0 - abs(vAcross);
    float edgeBreakup =
      (1.0 - smoothstep(0.015, 0.11, edgeDistance)) *
      smoothstep(
        0.68,
        0.86,
        noise21(vec2(vLongitudinal * 45.0 - uTime * 0.12, vAcross * 5.0))
      );
    float reveal =
      (1.0 - smoothstep(
        uReveal - 0.018,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.005, vLongitudinal);
    float alpha =
      (currents * mix(0.36, 0.22, uTheme) +
        edgeBreakup * mix(0.14, 0.095, uTheme)) *
      reveal;
    float oceanBlend =
      smoothstep(0.8, 0.91, uProgress) *
      smoothstep(0.7, 0.92, vLongitudinal);
    float oceanPath = exp(-pow(streamCoordinate / 0.07, 2.0));
    alpha *= mix(1.0, oceanPath * 0.18, oceanBlend);

    if (alpha < 0.008) {
      discard;
    }

    vec3 nightColor = vec3(0.92, 0.92, 0.89);
    vec3 morningColor = vec3(0.16, 0.19, 0.2);
    gl_FragColor = vec4(mix(nightColor, morningColor, uTheme), alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default flowDetailsFragmentShader;
