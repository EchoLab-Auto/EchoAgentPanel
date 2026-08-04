//! Built-in command handlers.

mod admin;
mod echo;
mod help;

pub use admin::AdminHandler;
pub use echo::EchoHandler;
pub use help::HelpHandler;

/// Parse a `prefix + name` command from the start of `text`.
///
/// Returns the argument string (already trimmed), or `None` if `text` does
/// not start with the command. A command must be followed by whitespace or
/// the end of the input, so `/echo` does not match `/echofoo`.
pub(crate) fn parse_command(text: &str, prefix: &str, name: &str) -> Option<String> {
    let expected = format!("{prefix}{name}");
    let rest = text.strip_prefix(&expected)?;
    if !rest.is_empty() && !rest.starts_with(char::is_whitespace) {
        return None;
    }
    Some(rest.trim_start().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_bare_command() {
        assert_eq!(parse_command("/help", "/", "help"), Some(String::new()));
    }

    #[test]
    fn matches_command_with_args() {
        assert_eq!(
            parse_command("/echo  hello world", "/", "echo"),
            Some("hello world".to_string())
        );
    }

    #[test]
    fn rejects_similar_prefix() {
        assert!(parse_command("/echofoo", "/", "echo").is_none());
        assert!(parse_command("/helpme", "/", "help").is_none());
    }

    #[test]
    fn rejects_non_command() {
        assert!(parse_command("just text", "/", "help").is_none());
    }
}
