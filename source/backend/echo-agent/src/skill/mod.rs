//! Skill system: SKILL.md-driven capabilities with progressive disclosure.
//!
//! Tier 1: metadata (name + description + keywords) injected into the system
//! prompt so the model knows what exists.
//! Tier 2: full instructions loaded when the skill triggers on a message.

use std::collections::HashMap;

use thiserror::Error;

pub mod loader;

/// Skill metadata (Tier 1 — cheap, always loaded).
#[derive(Debug, Clone)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    /// Keywords that trigger this skill when they appear in a message.
    pub keywords: Vec<String>,
    pub enabled: bool,
}

/// A loaded skill definition (Tier 2 — full instructions).
#[derive(Debug, Clone)]
pub struct Skill {
    pub metadata: SkillMetadata,
    pub instructions: String,
}

impl Skill {
    /// Whether a message triggers this skill (keyword match).
    /// 关键词匹配大小写不敏感（英文关键词 "calc" 也能命中 "Calc"）。
    pub fn matches(&self, content: &str) -> bool {
        if !self.metadata.enabled {
            return false;
        }
        let lower = content.to_lowercase();
        self.metadata
            .keywords
            .iter()
            .any(|k| !k.is_empty() && lower.contains(&k.to_lowercase()))
    }
}

/// Registry of discovered skills.
#[derive(Debug, Default, Clone)]
pub struct SkillRegistry {
    skills: HashMap<String, Skill>,
}

impl SkillRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Discover skills from `dir` (walks recursively for `SKILL.md` files).
    pub fn discover(dir: &str) -> Result<Self, SkillError> {
        let mut registry = Self::new();
        if dir.is_empty() || !std::path::Path::new(dir).exists() {
            return Ok(registry);
        }
        for entry in walkdir::WalkDir::new(dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() && path.file_name().and_then(|n| n.to_str()) == Some("SKILL.md") {
                let skill = loader::load_skill(path)?;
                registry.register(skill);
            }
        }
        Ok(registry)
    }

    pub fn register(&mut self, skill: Skill) {
        self.skills.insert(skill.metadata.name.clone(), skill);
    }

    pub fn get(&self, name: &str) -> Option<&Skill> {
        self.skills.get(name)
    }

    /// Find the first enabled skill triggered by the message.
    /// HashMap 迭代顺序随机，命中多个时按名称排序取第一个，保证确定性。
    pub fn find_matching(&self, content: &str) -> Option<&Skill> {
        let mut matched: Vec<&Skill> = self
            .skills
            .values()
            .filter(|s| s.matches(content))
            .collect();
        matched.sort_by_key(|s| s.metadata.name.clone());
        matched.into_iter().next()
    }

    pub fn set_enabled(&mut self, name: &str, enabled: bool) -> bool {
        match self.skills.get_mut(name) {
            Some(s) => {
                s.metadata.enabled = enabled;
                true
            }
            None => false,
        }
    }

    /// Compact Tier-1 listing for the system prompt.
    pub fn metadata_lines(&self) -> String {
        let mut lines: Vec<String> = self
            .skills
            .values()
            .filter(|s| s.metadata.enabled)
            .map(|s| {
                let keywords = if s.metadata.keywords.is_empty() {
                    String::new()
                } else {
                    format!(" (触发词: {})", s.metadata.keywords.join("、"))
                };
                format!(
                    "- {}: {}{}",
                    s.metadata.name, s.metadata.description, keywords
                )
            })
            .collect();
        lines.sort();
        lines.join("\n")
    }

    pub fn names(&self) -> Vec<String> {
        self.skills.keys().cloned().collect()
    }

    pub fn enabled_names(&self) -> Vec<String> {
        self.skills
            .values()
            .filter(|s| s.metadata.enabled)
            .map(|s| s.metadata.name.clone())
            .collect()
    }

    pub fn len(&self) -> usize {
        self.skills.len()
    }

    pub fn is_empty(&self) -> bool {
        self.skills.is_empty()
    }
}

#[derive(Debug, Error)]
pub enum SkillError {
    #[error("SKILL.md 加载失败 {path}: {err}")]
    Load { path: String, err: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    fn skill(name: &str, keywords: &[&str]) -> Skill {
        Skill {
            metadata: SkillMetadata {
                name: name.into(),
                description: "desc".into(),
                keywords: keywords.iter().map(|k| k.to_string()).collect(),
                enabled: true,
            },
            instructions: "instructions".into(),
        }
    }

    #[test]
    fn keyword_matching() {
        let s = skill("web-search", &["天气", "新闻"]);
        assert!(s.matches("今天天气怎么样"));
        assert!(!s.matches("你好"));
    }

    #[test]
    fn registry_find_matching() {
        let mut reg = SkillRegistry::new();
        reg.register(skill("calc", &["计算"]));
        reg.register(skill("web", &["搜索"]));
        assert_eq!(
            reg.find_matching("帮我计算一下").unwrap().metadata.name,
            "calc"
        );
        assert!(reg.find_matching("随便聊聊").is_none());
    }

    #[test]
    fn disabled_skills_do_not_match() {
        let mut reg = SkillRegistry::new();
        let mut s = skill("calc", &["计算"]);
        s.metadata.enabled = false;
        reg.register(s);
        assert!(reg.find_matching("计算一下").is_none());
    }

    #[test]
    fn keyword_matching_is_case_insensitive() {
        let s = skill("calc", &["calc"]);
        assert!(s.matches("use Calc now"));
        assert!(s.matches("CALC"));
    }

    #[test]
    fn empty_keywords_never_match() {
        let s = skill("empty", &[""]);
        assert!(!s.matches("anything"));
        let s2 = skill("none", &[]);
        assert!(!s2.matches("anything"));
    }

    #[test]
    fn find_matching_is_deterministic_with_multiple_hits() {
        let mut reg = SkillRegistry::new();
        reg.register(skill("zeta", &["触发"]));
        reg.register(skill("alpha", &["触发"]));
        reg.register(skill("middle", &["触发"]));
        // Alphabetically first match wins, regardless of insertion order.
        assert_eq!(
            reg.find_matching("触发消息").unwrap().metadata.name,
            "alpha"
        );
    }

    #[test]
    fn discover_walks_directories_recursively() {
        let dir = std::env::temp_dir().join(format!("echo-skills-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("nested")).unwrap();
        std::fs::write(
            dir.join("SKILL.md"),
            "---\nname: top-skill\ndescription: d\nkeywords: [top]\n---\nbody",
        )
        .unwrap();
        std::fs::write(
            dir.join("nested").join("SKILL.md"),
            "---\nname: nested-skill\ndescription: d\nkeywords: [nest]\n---\nbody",
        )
        .unwrap();
        // An unrelated file must be ignored.
        std::fs::write(dir.join("README.md"), "# not a skill").unwrap();

        let reg = SkillRegistry::discover(dir.to_str().unwrap()).unwrap();
        assert!(reg.get("top-skill").is_some());
        assert!(reg.get("nested-skill").is_some(), "recursive discovery");
        assert_eq!(reg.get("top-skill").unwrap().instructions, "body");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn discover_missing_or_empty_dir_is_empty() {
        assert!(SkillRegistry::discover("").unwrap().is_empty());
        let missing = std::env::temp_dir().join("echo-no-such-dir-xyz");
        assert!(SkillRegistry::discover(missing.to_str().unwrap())
            .unwrap()
            .is_empty());
    }
}
