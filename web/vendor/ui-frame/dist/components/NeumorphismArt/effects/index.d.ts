import { ArtEffect, ArtEffectName } from './types';

export declare const ART_EFFECTS: Record<ArtEffectName, ArtEffect>;
export type { ArtEffect, ArtEffectName, ArtMaskName, ArtPointer, ArtState } from './types';
export { createRng } from './types';
export { ART_MASKS, resolveMask } from './masks';
export type { ImageMask, MaskGrid } from './masks';
export { ASCII_RAMP, CHAR_RATIO, charFor, DEFAULT_DOT_MAX, DEFAULT_DOT_MIN, DEFAULT_OCCUPANCY, dotGeometry, dotRadiusFor, } from './masks';
export type { DotGeometry } from './masks';
