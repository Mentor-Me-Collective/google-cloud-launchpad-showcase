/**
 * Lumi's body parts, cut from assets/character/character-open.svg and character-blink.svg.
 * Every part keeps the original viewBox, so the layers stack exactly like the drawing and
 * each one can move on its own (arms around the shoulders, eyes around their centre, ...).
 */
import { Circle, Ellipse, G, Path } from 'react-native-svg';

/** The drawing itself (character-open.svg). */
export const LUMI_WIDTH = 165.471;
export const LUMI_HEIGHT = 160.247;

/**
 * The canvas every part is drawn on: the drawing plus a margin all around, so arms can swing
 * out and up without being cut off by the edge of the SVG.
 */
export const CANVAS = { x: -34, y: -30, w: LUMI_WIDTH + 68, h: LUMI_HEIGHT + 30 };
export const LUMI_VIEWBOX = `${CANVAS.x} ${CANVAS.y} ${CANVAS.w} ${CANVAS.h}`;

/**
 * A point of the drawing as a transform-origin ("x% y%") on the canvas.
 * Whole percentages only: React Native's parser reads `\d+%`, so "49.98%" breaks on phones
 * ("Transform origin z position must be a number") even though browsers accept it.
 */
export const origin = (x: number, y: number) =>
  `${Math.round(((x - CANVAS.x) / CANVAS.w) * 100)}% ${Math.round(((y - CANVAS.y) / CANVAS.h) * 100)}%`;

export const PIVOTS = {
  /** Where the body squashes from: the middle of the feet line. */
  body: origin(82.7, 140),
  /** At the outer edge of the shoulder, so a raised arm swings out where it can be seen. */
  leftShoulder: origin(16, 104),
  rightShoulder: origin(149.5, 104),
  eyes: origin(82.7, 72),
  mouth: origin(82.6, 85.5),
  leftBrowInner: origin(55.7, 44.3),
  rightBrowInner: origin(112.5, 44.3),
};

export function Feet() {
  return (
    <G>
      <Path
        d="M49.977 143.847 L51.205 135.937 C55.023 138.52 64.077 143.363 78.884 143.912 L78.884 151.557 C77.103 160.143 69.294 160.247 69.294 160.247 L53.154 160.247 C53.154 160.247 46.066 160.247 43.274 154.654 C41.15 146.305 49.977 143.847 49.977 143.847 Z"
        fill="#c0daff"
      />
      <Path
        d="M51.205 135.937 L52.135 129.95 C65.991 137.259 78.884 137.314 78.884 137.314 L78.884 143.912 C64.077 143.363 55.023 138.52 51.205 135.937 Z"
        fill="#69a0e4"
      />
      <Path
        d="M118.749 143.847 L117.521 135.937 C113.703 138.52 104.649 143.363 89.842 143.912 L89.842 151.557 C91.623 160.143 99.432 160.247 99.432 160.247 L115.573 160.247 C115.573 160.247 122.66 160.247 125.452 154.654 C127.576 146.305 118.749 143.847 118.749 143.847 Z"
        fill="#c0daff"
      />
      <Path
        d="M117.521 135.937 L116.591 129.95 C102.736 137.259 89.842 137.314 89.842 137.314 L89.842 143.912 C104.649 143.363 113.703 138.52 117.521 135.937 Z"
        fill="#69a0e4"
      />
    </G>
  );
}

export function LeftArm() {
  return (
    <G>
      <Path
        d="M0.994 125.676 C-2.22 117.369 3.116 108.208 6.279 103.815 C7.968 111.034 13.097 123.105 28.626 126.762 C29.401 126.945 30.155 127.115 30.888 127.273 C26.404 133.617 20.765 135.619 18.833 136.071 C15.72 136.799 5.419 137.117 0.994 125.676 Z"
        fill="#bddbff"
      />
      <Path
        d="M18.833 92.24 C21.381 90.66 38.715 89.638 36.705 110.112 C35.942 117.884 33.631 123.391 30.888 127.273 C30.155 127.115 29.401 126.945 28.626 126.762 C13.097 123.105 7.968 111.034 6.279 103.815 C6.982 102.838 7.577 102.098 7.948 101.654 C8.471 101.027 8.739 100.706 8.75 100.693 C13.105 95.394 16.36 93.775 18.833 92.24 Z"
        fill="#8bbafa"
      />
    </G>
  );
}

export function RightArm() {
  return (
    <G>
      <Path
        d="M164.477 125.676 C167.69 117.369 162.355 108.208 159.192 103.815 C157.502 111.034 152.374 123.105 136.844 126.762 C136.07 126.945 135.316 127.115 134.583 127.273 C139.066 133.617 144.706 135.619 146.637 136.071 C149.751 136.799 160.052 137.117 164.477 125.676 Z"
        fill="#bddbff"
      />
      <Path
        d="M146.637 92.24 C144.09 90.66 126.756 89.638 128.766 110.112 C129.529 117.884 131.839 123.391 134.583 127.273 C135.316 127.115 136.07 126.945 136.844 126.762 C152.374 123.105 157.502 111.034 159.192 103.815 C158.489 102.838 157.894 102.098 157.523 101.654 C156.999 101.027 156.732 100.706 156.721 100.693 C152.366 95.394 149.111 93.775 146.637 92.24 Z"
        fill="#8bbafa"
      />
    </G>
  );
}

export function Torso() {
  return (
    <G>
      <Path
        d="M85.479 125.896 C100.876 125.896 114.91 121.716 125.49 114.853 C128.793 116.224 132.415 116.981 136.214 116.981 C136.512 116.981 136.808 116.977 137.104 116.967 C126.787 129.717 107.531 138.292 85.479 138.292 C64.157 138.292 45.449 130.276 34.908 118.221 C39.064 118.032 43.01 117.099 46.593 115.565 C57.033 122.004 70.621 125.896 85.479 125.896 Z"
        fill="#87b5f7"
      />
      <Path
        d="M29.245 38.144 C30.691 16.876 51.895 0 77.841 0 C98.179 0 115.603 10.37 122.881 25.096 C123.468 25.063 124.058 25.047 124.652 25.047 C143.794 25.047 159.313 42.164 159.313 63.28 C159.313 66.287 158.998 69.213 158.403 72.02 C162.025 76.732 164.179 82.631 164.179 89.032 C164.179 104.171 152.137 116.498 137.104 116.967 C136.808 116.977 136.512 116.981 136.214 116.981 C132.415 116.981 128.793 116.224 125.49 114.853 C114.91 121.716 100.876 125.896 85.479 125.896 C70.621 125.896 57.033 122.004 46.593 115.565 C43.01 117.099 39.064 118.032 34.908 118.221 C34.386 118.244 33.86 118.256 33.331 118.256 C15.852 118.256 1.683 105.124 1.683 88.925 C1.683 83.309 3.387 78.061 6.341 73.601 C5.743 71.349 5.426 68.994 5.426 66.571 C5.426 52.876 15.553 41.373 29.245 38.144 Z"
        fill="#c1d9fd"
      />
    </G>
  );
}

/** Soft pink cheeks, shown when Lumi is happy. Not in the original drawing. */
export function Cheeks() {
  return (
    <G>
      <Ellipse cx="38" cy="90" rx="9" ry="5" fill="#ff9fc4" opacity={0.55} />
      <Ellipse cx="127" cy="90" rx="9" ry="5" fill="#ff9fc4" opacity={0.55} />
    </G>
  );
}

export function EyeWhites() {
  return (
    <G>
      <Circle cx="53.469" cy="71.843" r="19.363" fill="#fefcfe" />
      <Circle cx="112.394" cy="72.123" r="19.363" fill="#fefcfe" />
    </G>
  );
}

export function Pupils() {
  return (
    <G>
      <Ellipse cx="57.608" cy="72.123" rx="15.224" ry="15.359" fill="#12378f" />
      <Circle cx="61.491" cy="65.585" r="3.993" fill="#fefcfe" />
      <Circle cx="66.872" cy="69.577" r="1.529" fill="#fefcfe" />
      <Ellipse cx="108.255" cy="72.404" rx="15.224" ry="15.359" fill="#12378f" />
      <Circle cx="109.784" cy="69.858" r="1.529" fill="#fefcfe" />
      <Circle cx="114.861" cy="65.866" r="3.993" fill="#fefcfe" />
    </G>
  );
}

/** The closed-eye arcs from character-blink.svg: a blink, or happy "^ ^" eyes. */
export function ClosedEyes() {
  return (
    <G fill="none" stroke="#010d4e" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M42.944 74.406 C42.944 74.406 55.914 64.777 63.182 77.565" />
      <Path d="M123.919 74.406 C123.919 74.406 110.949 64.777 103.681 77.565" />
    </G>
  );
}

export function Mouth() {
  return (
    <G>
      <Path
        d="M75.15 85.072 C74.981 84.437 73.496 78.187 81.043 80.468 C81.086 80.481 81.159 80.507 81.259 80.547 C81.695 80.716 83.443 81.26 85.952 80.307 C88.587 79.306 90.168 81.122 90.445 81.476 C90.475 81.514 90.501 81.555 90.522 81.599 C90.771 82.108 92.214 85.555 87.741 89.188 C87.732 89.195 87.724 89.201 87.716 89.208 L87.716 89.208 C87.562 88.236 86.822 86.133 82.187 85.998 C77.935 85.875 77.717 88.644 77.713 89.159 C76.67 88.16 75.798 86.816 75.182 85.173 C75.169 85.138 75.158 85.104 75.15 85.072 Z"
        fill="#12378f"
      />
      <Path
        d="M77.713 89.159 C77.717 88.644 77.935 85.875 82.187 85.998 C86.822 86.133 87.562 88.236 87.716 89.208 L87.716 89.208 C84.236 92.018 80.406 91.738 77.713 89.159 Z"
        fill="#569ff4"
      />
    </G>
  );
}

/** A small frown for "oops" moments. Not in the original drawing. */
export function SadMouth() {
  return (
    <Path
      d="M75.5 90 C78.5 84.5 86.5 84.5 89.5 90"
      fill="none"
      stroke="#12378f"
      strokeWidth={3.2}
      strokeLinecap="round"
    />
  );
}

export function LeftBrow() {
  return (
    <Path
      d="M42.944 47.792 C42.944 47.792 47.438 42.924 55.71 44.308"
      fill="none"
      stroke="#20499b"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function RightBrow() {
  return (
    <Path
      d="M125.222 47.792 C125.222 47.792 120.729 42.924 112.457 44.308"
      fill="none"
      stroke="#234897"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
