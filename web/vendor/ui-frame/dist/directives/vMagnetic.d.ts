import { Directive } from 'vue';

interface MagneticOptions {
    /** Max translate in px (default: 6) */
    strength?: number;
    /** Max rotation in degrees (default: 3) */
    rotation?: number;
}
export declare const vMagnetic: Directive<HTMLElement, MagneticOptions | undefined>;
export default vMagnetic;
