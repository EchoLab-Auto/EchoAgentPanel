import { Ref, ComputedRef } from 'vue';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';
export interface UploadFile {
    /** Unique identifier */
    id: string;
    /** Original file name */
    name: string;
    /** File size in bytes */
    size: number;
    /** MIME type */
    type: string;
    /** Upload lifecycle status */
    status: UploadStatus;
    /** Upload progress (0–100) */
    progress: number;
    /** ObjectURL for image preview (cleaned up on remove) */
    url?: string;
    /** Error message if status === 'error' */
    error?: string;
    /** Raw File object reference */
    raw?: File;
}
export interface UseUploadOptions {
    /** Accepted MIME types / extensions, e.g. "image/*,.pdf" */
    accept?: Ref<string | undefined> | ComputedRef<string | undefined>;
    /** Maximum file size in bytes */
    maxSize?: Ref<number | undefined> | ComputedRef<number | undefined>;
    /** Maximum number of files allowed */
    maxCount?: Ref<number | undefined> | ComputedRef<number | undefined>;
    /** Whether multiple files can be selected */
    multiple?: Ref<boolean> | ComputedRef<boolean>;
    /** Automatically start upload after file selection */
    autoUpload?: Ref<boolean> | ComputedRef<boolean>;
    /** Callback when file count exceeds maxCount */
    onExceed?: (excessCount: number) => void;
    /** Callback when file size exceeds maxSize */
    onSizeExceed?: (file: File) => void;
    /** Callback when file type is not accepted */
    onTypeError?: (file: File) => void;
    /** Custom upload function — receives file, returns a promise resolving to progress (0–100) or void */
    uploadFn?: (file: UploadFile) => Promise<void>;
}
export interface UseUploadReturn {
    /** Current file list */
    files: Ref<UploadFile[]>;
    /** Whether a drag operation is hovering over the drop zone */
    dragOver: Ref<boolean>;
    /** Add files to the list (validates first) */
    addFiles: (fileList: FileList | File[]) => void;
    /** Remove a single file by id — cleans up ObjectURL */
    removeFile: (id: string) => void;
    /** Clear all files — cleans up all ObjectURLs */
    clearFiles: () => void;
    /** Manually trigger upload for pending files */
    upload: () => Promise<void>;
    /** Hidden file input element ref */
    fileInputRef: Ref<HTMLInputElement | null>;
    /** Set dragOver to true on dragover/enter */
    handleDrag: (event: DragEvent) => void;
    /** Reset dragOver counter on dragleave */
    handleDragLeave: (event: DragEvent) => void;
    /** Add files from drop event, reset dragOver */
    handleDrop: (event: DragEvent) => void;
    /** Open file picker dialog */
    handleFileInput: (event: Event) => void;
}
/**
 * Headless upload — encapsulates file selection, validation, drag-and-drop
 * tracking, upload progress simulation, and ObjectURL lifecycle management.
 * Use with your own UI rendering.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useUpload } from '@echolab-auto/ui-frame'
 * const { files, dragOver, fileInputRef, addFiles, removeFile, clearFiles, upload, handleDrag, handleDrop, handleFileInput } = useUpload({})
 * </script>
 * ```
 */
export declare function useUpload(opts?: UseUploadOptions): UseUploadReturn;
