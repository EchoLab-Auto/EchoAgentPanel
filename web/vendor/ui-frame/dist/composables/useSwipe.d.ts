import { Ref } from 'vue';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export interface UseSwipeOptions {
    /** Minimum swipe distance in px to trigger (default: 50) */
    threshold?: number;
    /** Only detect swipes starting from the screen edge (default: false) */
    edgeOnly?: boolean;
    /** Edge width in px for edgeOnly mode (default: 40) */
    edgeWidth?: number;
    /** Called when a swipe is completed */
    onSwipe?: (direction: SwipeDirection) => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}
export interface UseSwipeReturn {
    /** Current swipe direction during active gesture */
    direction: Ref<SwipeDirection | null>;
    /** Current swipe distance in px */
    distance: Ref<number>;
    /** Whether a swipe gesture is in progress */
    isSwiping: Ref<boolean>;
}
export declare function useSwipe(target: Ref<HTMLElement | null>, options?: UseSwipeOptions): UseSwipeReturn;
