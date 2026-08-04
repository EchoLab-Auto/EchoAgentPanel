//! Tool system: named, described, executable capabilities the LLM can call.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};
use thiserror::Error;

use crate::llm::ToolDefinition;

pub mod builtin;

#[derive(Debug, Error)]
pub enum ToolError {
    #[error("工具参数无效: {0}")]
    InvalidArguments(String),
    #[error("工具执行失败: {0}")]
    Execution(String),
    #[error("找不到工具: {0}")]
    NotFound(String),
}

/// A capability the LLM can invoke during the agent loop.
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    /// JSON Schema for the arguments object.
    fn parameters(&self) -> Value {
        json!({"type": "object", "properties": {}})
    }
    async fn execute(&self, arguments: Value) -> Result<String, ToolError>;
}

/// Registry of tools, keyed by name.
pub struct ToolRegistry {
    tools: HashMap<String, Arc<dyn Tool>>,
    cached_definitions: std::sync::RwLock<Option<Arc<Vec<ToolDefinition>>>>,
}

impl std::fmt::Debug for ToolRegistry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ToolRegistry").field("names", &self.names()).finish()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self { tools: HashMap::new(), cached_definitions: std::sync::RwLock::new(None) }
    }
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: HashMap::new(), cached_definitions: std::sync::RwLock::new(None) }
    }

    pub fn register(&mut self, tool: Arc<dyn Tool>) {
        self.tools.insert(tool.name().to_string(), tool);
        *self.cached_definitions.write().unwrap() = None;
    }

    pub fn definitions(&self) -> Arc<Vec<ToolDefinition>> {
        {
            let cached = self.cached_definitions.read().unwrap();
            if let Some(ref defs) = *cached {
                return Arc::clone(defs);
            }
        }
        let defs: Vec<ToolDefinition> = self.tools
            .values()
            .map(|t| ToolDefinition {
                name: t.name().to_string(),
                description: t.description().to_string(),
                parameters: Some(t.parameters()),
            })
            .collect();
        let arc = Arc::new(defs);
        *self.cached_definitions.write().unwrap() = Some(Arc::clone(&arc));
        arc
    }

    pub async fn execute(&self, name: &str, arguments: Value) -> Result<String, ToolError> {
        match self.tools.get(name) {
            Some(tool) => tool.execute(arguments).await,
            None => Err(ToolError::NotFound(name.to_string())),
        }
    }

    pub fn names(&self) -> Vec<String> {
        self.tools.keys().cloned().collect()
    }

    pub fn len(&self) -> usize {
        self.tools.len()
    }

    pub fn is_empty(&self) -> bool {
        self.tools.is_empty()
    }
}
