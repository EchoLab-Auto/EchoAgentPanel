//! Color theme with layered brightness for visual hierarchy.
//!
//! 亮度层次（从强到弱）：
//! `title` > `fg`(正文) > `subtitle` > `dim`(次要) > `faint`(最弱/占位)
//! 背景：`bg`(最暗) < `panel_bg`(面板) < `overlay_bg`(弹窗遮罩)
//! 边框：`border`(常规) < `border_focused`(焦点高亮)

use ratatui::style::Color;

#[derive(Debug, Clone, Copy)]
pub struct Theme {
    // ---- 背景层级 ----
    pub bg: Color,
    /// 面板/列表背景（比 bg 亮一档）。
    pub panel_bg: Color,
    /// 弹窗/遮罩背景（比 bg 暗，用于压暗背后的内容）。
    pub overlay_bg: Color,
    /// 列表选中行背景。
    pub highlight_bg: Color,
    // ---- 文字亮度层级 ----
    /// 最亮：标题、强调信息。
    pub title: Color,
    /// 正文。
    pub fg: Color,
    /// 次级标题。
    pub subtitle: Color,
    /// 次要文字（消息预览、元信息）。
    pub dim: Color,
    /// 最弱文字（占位符、快捷键提示）。
    pub faint: Color,
    // ---- 功能色 ----
    pub accent: Color,
    /// 常规边框。
    pub border: Color,
    /// 焦点/激活边框。
    pub border_focused: Color,
    // ---- 角色色 ----
    pub user_fg: Color,
    pub agent_fg: Color,
    pub tool_fg: Color,
    pub system_fg: Color,
    pub success: Color,
    pub error: Color,
}

impl Theme {
    pub fn dark() -> Self {
        Self {
            bg: Color::Rgb(18, 20, 24),
            panel_bg: Color::Rgb(27, 30, 36),
            overlay_bg: Color::Rgb(12, 13, 16),
            highlight_bg: Color::Rgb(45, 58, 88),
            title: Color::Rgb(255, 255, 255),
            fg: Color::Rgb(225, 228, 232),
            subtitle: Color::Rgb(170, 176, 184),
            dim: Color::Rgb(128, 134, 142),
            faint: Color::Rgb(86, 92, 100),
            accent: Color::Rgb(79, 140, 255),
            border: Color::Rgb(48, 53, 61),
            border_focused: Color::Rgb(122, 172, 255),
            user_fg: Color::Rgb(82, 200, 255),
            agent_fg: Color::Rgb(120, 220, 160),
            tool_fg: Color::Rgb(214, 178, 110),
            system_fg: Color::Rgb(150, 156, 164),
            success: Color::Rgb(52, 199, 89),
            error: Color::Rgb(255, 79, 68),
        }
    }

    pub fn light() -> Self {
        Self {
            bg: Color::Rgb(255, 255, 255),
            panel_bg: Color::Rgb(246, 247, 249),
            overlay_bg: Color::Rgb(232, 234, 237),
            highlight_bg: Color::Rgb(214, 227, 255),
            title: Color::Rgb(10, 12, 16),
            fg: Color::Rgb(40, 44, 50),
            subtitle: Color::Rgb(95, 101, 108),
            dim: Color::Rgb(130, 135, 142),
            faint: Color::Rgb(168, 173, 179),
            accent: Color::Rgb(0, 90, 220),
            border: Color::Rgb(205, 210, 216),
            border_focused: Color::Rgb(70, 130, 240),
            user_fg: Color::Rgb(0, 100, 190),
            agent_fg: Color::Rgb(0, 130, 80),
            tool_fg: Color::Rgb(150, 110, 30),
            system_fg: Color::Rgb(100, 105, 112),
            success: Color::Rgb(20, 140, 60),
            error: Color::Rgb(200, 40, 30),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Luminance of an RGB color (0..=255), used to verify brightness layering.
    fn luminance(c: Color) -> u8 {
        match c {
            Color::Rgb(r, g, b) => {
                ((r as u32 * 299 + g as u32 * 587 + b as u32 * 114) / 1000) as u8
            }
            _ => 128,
        }
    }

    #[test]
    fn dark_theme_text_brightness_decreases_by_layer() {
        let t = Theme::dark();
        // title > fg > subtitle > dim > faint
        assert!(luminance(t.title) > luminance(t.fg));
        assert!(luminance(t.fg) > luminance(t.subtitle));
        assert!(luminance(t.subtitle) > luminance(t.dim));
        assert!(luminance(t.dim) > luminance(t.faint));
    }

    #[test]
    fn light_theme_text_brightness_increases_by_layer() {
        let t = Theme::light();
        // On light backgrounds, higher layers are *darker* (less luminance).
        assert!(luminance(t.faint) > luminance(t.dim));
        assert!(luminance(t.dim) > luminance(t.subtitle));
        assert!(luminance(t.subtitle) > luminance(t.fg));
        assert!(luminance(t.fg) > luminance(t.title));
    }

    #[test]
    fn both_themes_have_distinct_role_colors() {
        let dark = Theme::dark();
        let light = Theme::light();
        for c in [dark.user_fg, dark.agent_fg, dark.tool_fg, dark.system_fg] {
            assert_ne!(c, dark.fg, "role colors differ from body text");
        }
        assert_ne!(dark.success, dark.error);
        assert_ne!(light.success, light.error);
        assert_ne!(dark.border, dark.border_focused);
    }

    #[test]
    fn focused_border_stands_out_from_regular() {
        let dark = Theme::dark();
        assert!(luminance(dark.border_focused) > luminance(dark.border));
    }
}
