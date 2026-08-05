//! Shared utility functions.
//!
//! CJK-aware text helpers, key-chord construction, timestamp formatting,
//! and a panic-catch wrapper used in several places across the crate.

use ratatui::crossterm::event::KeyEvent;
use unicode_width::UnicodeWidthChar;

/// Visual width of a string (CJK characters are 2 columns wide).
pub fn str_visual_width(s: &str) -> usize {
    s.chars().map(|c| c.width().unwrap_or(1)).sum()
}

/// Convert a visual column to a byte offset within `s`.
/// CJK-aware: clicking the second half of a wide character maps to the
/// start of that character.
pub fn col_to_byte(s: &str, col: usize) -> usize {
    let mut acc = 0usize;
    for (i, ch) in s.char_indices() {
        let w = ch.width().unwrap_or(1);
        if col < acc + w {
            return i;
        }
        acc += w;
    }
    s.len()
}

/// Build a `KeyChord` from a `KeyEvent`.
pub fn chord_of(key: &KeyEvent) -> crate::keybindings::KeyChord {
    crate::keybindings::KeyChord {
        code: key.code,
        modifiers: key.modifiers,
    }
}

/// Format a Unix timestamp into a localized `HH:MM:SS` string.
pub fn format_timestamp(ts: i64) -> String {
    if ts <= 0 {
        return String::new();
    }
    chrono::DateTime::from_timestamp(ts, 0)
        .map(|d| {
            d.with_timezone(&chrono::Local)
                .format("%H:%M:%S")
                .to_string()
        })
        .unwrap_or_default()
}

/// Format a Unix timestamp for display in session lists (compact form).
pub fn format_timestamp_compact(ts: i64) -> String {
    if ts <= 0 {
        return String::new();
    }
    chrono::DateTime::from_timestamp(ts, 0)
        .map(|d| {
            d.with_timezone(&chrono::Local)
                .format("%m/%d %H:%M")
                .to_string()
        })
        .unwrap_or_default()
}

/// Catch a panic from a closure and return `None` on panic, `Some(T)` on success.
/// Used to safely wrap input handlers and event processors.
pub fn catch_panic<F, R>(f: F) -> Option<R>
where
    F: FnOnce() -> R + std::panic::UnwindSafe,
{
    match std::panic::catch_unwind(f) {
        Ok(result) => Some(result),
        Err(e) => {
            let msg = if let Some(s) = e.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = e.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "unknown panic".into()
            };
            tracing::error!("panic caught: {msg}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn visual_width_counts_cjk_as_two() {
        assert_eq!(str_visual_width("abc"), 3);
        assert_eq!(str_visual_width("你好"), 4);
        assert_eq!(str_visual_width("a好b"), 4);
        assert_eq!(str_visual_width(""), 0);
    }

    #[test]
    fn col_to_byte_maps_wide_char_columns() {
        assert_eq!(col_to_byte("abc", 2), 2);
        assert_eq!(col_to_byte("你好", 0), 0);
        // Clicking the second column of "你" maps to the start of "你".
        assert_eq!(col_to_byte("你好", 1), 0);
        assert_eq!(col_to_byte("你好", 2), 3);
        // Past the end → full length.
        assert_eq!(col_to_byte("你好", 99), 6);
    }

    #[test]
    fn timestamp_formatting_handles_invalid_input() {
        assert_eq!(format_timestamp(0), "");
        assert_eq!(format_timestamp(-5), "");
        assert_eq!(format_timestamp_compact(0), "");
        // A known timestamp formats without panicking.
        let s = format_timestamp(1700000000);
        assert!(!s.is_empty());
    }

    #[test]
    fn catch_panic_returns_result_or_none() {
        assert_eq!(catch_panic(|| 42), Some(42));
        assert!(catch_panic(|| panic!("boom")).is_none());
    }
}
