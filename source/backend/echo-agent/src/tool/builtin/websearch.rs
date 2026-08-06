//! Web search tool — Bing RSS-backed search, no API key required.
//!
//! Uses the public `cn.bing.com/search?format=rss` endpoint (reachable from
//! mainland networks) and parses the returned RSS items.

use std::sync::OnceLock;

use async_trait::async_trait;
use regex::Regex;
use serde_json::{json, Value};

use crate::tool::{Tool, ToolError};

#[derive(Debug, Default)]
pub struct WebSearchTool;

#[async_trait]
impl Tool for WebSearchTool {
    fn name(&self) -> &str {
        "web_search"
    }

    fn description(&self) -> &str {
        "搜索网页获取最新信息（新闻、天气、百科、实时数据）。参数: query(搜索关键词), max_results(可选, 默认5, 最大10)。"
    }

    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "max_results": {"type": "integer", "description": "返回结果数量，默认5，最大10"}
            },
            "required": ["query"]
        })
    }

    async fn execute(&self, arguments: Value) -> Result<String, ToolError> {
        let query = arguments
            .get("query")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ToolError::InvalidArguments("缺少 query 参数".into()))?;

        let max_results = arguments
            .get("max_results")
            .and_then(|v| v.as_u64())
            .unwrap_or(5)
            .clamp(1, 10) as usize;

        let results = search_bing(query, max_results).await?;

        if results.is_empty() {
            return Ok(format!("未搜索到关于“{query}”的结果。"));
        }

        let mut out = Vec::new();
        for (i, r) in results.iter().enumerate() {
            let mut block = format!("{}. {}", i + 1, r.title);
            if !r.url.is_empty() {
                block.push('\n');
                block.push_str(&r.url);
            }
            if !r.snippet.is_empty() {
                block.push('\n');
                block.push_str(&r.snippet);
            }
            out.push(block);
        }
        Ok(out.join("\n\n"))
    }
}

struct SearchResult {
    title: String,
    url: String,
    snippet: String,
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::limited(5))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")
            .build()
            .expect("failed to build reqwest client for web_search")
    })
}

async fn search_bing(query: &str, max_results: usize) -> Result<Vec<SearchResult>, ToolError> {
    let resp = client()
        .get("https://cn.bing.com/search")
        .query(&[("q", query), ("format", "rss")])
        .send()
        .await
        .map_err(|e| ToolError::Execution(format!("搜索请求失败: {e}")))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| ToolError::Execution(format!("读取搜索响应失败: {e}")))?;

    if !status.is_success() {
        return Err(ToolError::Execution(format!(
            "搜索服务返回状态码 {status}"
        )));
    }

    Ok(parse_rss(&body, max_results))
}

fn parse_rss(body: &str, max_results: usize) -> Vec<SearchResult> {
    let item_re = Regex::new(r"(?s)<item>(.*?)</item>").expect("item regex");
    let title_re = Regex::new(r"(?s)<title>(.*?)</title>").expect("title regex");
    let link_re = Regex::new(r"(?s)<link>(.*?)</link>").expect("link regex");
    let desc_re = Regex::new(r"(?s)<description>(.*?)</description>").expect("desc regex");

    let mut results = Vec::new();
    for cap in item_re.captures_iter(body).take(max_results) {
        let block = &cap[1];
        let title = extract(block, &title_re);
        let url = extract(block, &link_re);
        let snippet = extract(block, &desc_re);
        if title.is_empty() && url.is_empty() {
            continue;
        }
        results.push(SearchResult {
            title: decode_entities(&clean_html(&title)),
            url: decode_entities(&url),
            snippet: decode_entities(&clean_html(&snippet)),
        });
    }
    results
}

fn extract(block: &str, re: &Regex) -> String {
    re.captures(block)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_default()
}

/// Remove HTML tags and collapse whitespace.
fn clean_html(s: &str) -> String {
    if s.is_empty() {
        return String::new();
    }
    let tag_re = Regex::new(r"<[^>]*>").expect("tag regex");
    let ws_re = Regex::new(r"\s+").expect("ws regex");
    ws_re.replace_all(&tag_re.replace_all(s, " "), " ")
        .trim()
        .to_string()
}

/// Decode common XML entities.
fn decode_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"<?xml version="1.0" encoding="utf-8" ?><rss version="2.0"><channel>
<title>必应：测试</title>
<item><title>测试标题 &amp; 更多</title><link>https://example.com/a</link><description>这是<b>摘要</b>内容，&amp; 带实体。</description></item>
<item><title>第二条</title><link>https://example.com/b</link><description></description></item>
<item><title></title><link></link><description>无标题无链接应被跳过</description></item>
</channel></rss>"#;

    #[test]
    fn parses_rss_items() {
        let results = parse_rss(SAMPLE, 10);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].title, "测试标题 & 更多");
        assert_eq!(results[0].url, "https://example.com/a");
        assert_eq!(results[0].snippet, "这是 摘要 内容，& 带实体。");
        assert_eq!(results[1].title, "第二条");
        assert_eq!(results[1].snippet, "");
    }

    #[test]
    fn respects_max_results() {
        let results = parse_rss(SAMPLE, 1);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "测试标题 & 更多");
    }

    #[test]
    fn decodes_entities() {
        assert_eq!(decode_entities("a&amp;b&lt;c&gt;d&quot;e&#39;f"), "a&b<c>d\"e'f");
    }

    #[tokio::test]
    #[tokio::test]
    #[ignore = "需要外网，按需手动运行"]
    async fn live_bing_search() {
        let results = search_bing("沪深指数", 3).await.unwrap();
        assert!(!results.is_empty(), "live search should return results");
        println!("=== live search results ===");
        for r in &results {
            println!("TITLE: {}", r.title);
            println!("URL:   {}", r.url);
            println!("SNIP:  {}", r.snippet);
            println!("---");
        }
    }
}
