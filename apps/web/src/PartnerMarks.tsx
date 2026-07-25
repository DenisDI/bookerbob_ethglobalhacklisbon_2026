// Partner marks, inlined from the design package so they inherit the
// accountability colour of the step they sit in (currentColor, not a fixed fill).
//
// Placement rules from the package: small, quiet, at the working step. World
// where the credential is checked, The Graph on the standing row, Hedera only at
// the settlement row of the finale. Never a banner, never a "powered by" footer,
// never larger than the label beside it.

export function WorldMark({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600.1 600.1"
      fill="none"
      stroke="currentColor"
      strokeWidth={38}
      aria-hidden="true"
    >
      <g transform="translate(-99.69,-99.95)">
        <g transform="matrix(1.2367,0,0,1.2367,-668.3,-668.51)">
          <g transform="matrix(1.29947,0,0,1.29947,725.31494,727.89368)">
            <g transform="translate(131.18,104.74)">
              <path
                strokeLinecap="round"
                d="m 119.067,-87.470001 c 0,0 -145.507001,0.230003 -145.507001,0.230003 C -74.620003,-87.239998 -113.68,-48.18 -113.68,0 c 0,48.18 39.059997,87.239998 87.239999,87.239998 0,0 140.120001,0 140.120001,0"
              />
            </g>
          </g>
          <g transform="matrix(1.29947,0,0,1.29947,643.73987,841.25928)">
            <path strokeLinecap="round" d="m 2.309,17.5 c 0,0 336.11101,0 336.11101,0" />
          </g>
          <g transform="matrix(1.29947,0,0,1.29947,620.99915,621.3761)">
            <g transform="translate(186.71,186.71)">
              <path d="M 0,-169.21001 C 93.452003,-169.21001 169.21001,-93.452003 169.21001,0 169.21001,93.452003 93.452003,169.21001 0,169.21001 -93.452003,169.21001 -169.21001,93.452003 -169.21001,0 -169.21001,-93.452003 -93.452003,-169.21001 0,-169.21001 Z" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export function TheGraphMark({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="currentColor"
      aria-hidden="true"
    >
      <g transform="translate(-88,-52)">
        <path d="M135.3,106.2c-7.1,0-12.8-5.7-12.8-12.8c0-7.1,5.7-12.8,12.8-12.8c7.1,0,12.8,5.7,12.8,12.8C148.1,100.5,142.4,106.2,135.3,106.2 M135.3,74.2c10.6,0,19.2,8.6,19.2,19.2s-8.6,19.2-19.2,19.2c-10.6,0-19.2-8.6-19.2-19.2S124.7,74.2,135.3,74.2z M153.6,113.6c1.3,1.3,1.3,3.3,0,4.5l-12.8,12.8c-1.3,1.3-3.3,1.3-4.5,0c-1.3-1.3-1.3-3.3,0-4.5l12.8-12.8C150.3,112.3,152.4,112.3,153.6,113.6z M161,77.4c0,1.8-1.4,3.2-3.2,3.2c-1.8,0-3.2-1.4-3.2-3.2s1.4-3.2,3.2-3.2C159.5,74.2,161,75.6,161,77.4z" />
      </g>
    </svg>
  );
}

/** The finale card is bone, so this mark is drawn in card ink deliberately. */
export function HederaMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2500 2500" aria-hidden="true">
      <path
        d="M1250,0C559.64,0,0,559.64,0,1250S559.64,2500,1250,2500s1250-559.64,1250-1250S1940.36,0,1250,0"
        fill="currentColor"
      />
      <path
        d="M1758.12,1790.62H1599.38V1453.13H900.62v337.49H741.87V696.25H900.62v329.37h698.76V696.25h158.75Zm-850-463.75h698.75V1152.5H908.12Z"
        fill="var(--color-card-bg)"
      />
    </svg>
  );
}
