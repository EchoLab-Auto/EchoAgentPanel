//! Adapter lifecycle tools — start/stop/restart/status.
//! These are LLM-callable tools for managing platform adapters (QQ etc.).

use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::tool::{Tool, ToolError, ToolRegistry};
#[allow(unused_imports)]
use echo_adapter::traits::Adapter;
use echo_adapter::AdapterRegistry;

// ── AdapterStatusTool ──

pub struct AdapterStatusTool {
    adapters: Arc<AdapterRegistry>,
}

impl AdapterStatusTool {
    pub fn new(adapters: Arc<AdapterRegistry>) -> Self {
        Self { adapters }
    }
}

#[async_trait]
impl Tool for AdapterStatusTool {
    fn name(&self) -> &str { "adapter_status" }
    fn description(&self) -> &str {
        "Check the status of all platform adapters (QQ etc.). Returns which adapters are running, connected, or stopped."
    }
    fn parameters(&self) -> Value {
        json!({"type": "object", "properties": {}})
    }
    async fn execute(&self, _args: Value) -> Result<String, ToolError> {
        let infos = self.adapters.list_info();
        if infos.is_empty() {
            return Ok("No adapters configured. Use [adapters.qq] enabled = true in config to enable QQ.".into());
        }
        let lines: Vec<String> = infos.iter().map(|info| {
            let status = match info.status {
                echo_adapter::AdapterConnectionState::Connected => "connected",
                echo_adapter::AdapterConnectionState::Disconnected => "running (no client)",
                echo_adapter::AdapterConnectionState::Stopped => "stopped",
                echo_adapter::AdapterConnectionState::Starting => "starting",
                echo_adapter::AdapterConnectionState::Stopping => "stopping",
                echo_adapter::AdapterConnectionState::Error => "error",
            };
            let id = info.self_id.as_deref().unwrap_or("-");
            format!("{}: {} (self: {})", info.display_name, status, id)
        }).collect();
        Ok(lines.join("\n"))
    }
}

// ── AdapterStartTool ──

pub struct AdapterStartTool {
    adapters: Arc<AdapterRegistry>,
}

impl AdapterStartTool {
    pub fn new(adapters: Arc<AdapterRegistry>) -> Self {
        Self { adapters }
    }
}

#[async_trait]
impl Tool for AdapterStartTool {
    fn name(&self) -> &str { "adapter_start" }
    fn description(&self) -> &str {
        "Start a platform adapter (e.g. QQ). Use 'all' to start all configured adapters."
    }
    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Adapter name: 'qq' or 'all'"}
            },
            "required": ["name"]
        })
    }
    async fn execute(&self, args: Value) -> Result<String, ToolError> {
        let name = args["name"].as_str().unwrap_or("all").to_lowercase();
        if name == "all" {
            let results = self.adapters.start_all().await;
            let lines: Vec<String> = results.iter().map(|(n, r)| {
                match r {
                    Ok(()) => format!("{}: started", n),
                    Err(e) => format!("{}: {}", n, e),
                }
            }).collect();
            Ok(if lines.is_empty() { "No adapters to start.".into() } else { lines.join("\n") })
        } else {
            match self.adapters.get(&name) {
                Some(adapter) => match adapter.start().await {
                    Ok(()) => Ok(format!("{} adapter started.", adapter.display_name())),
                    Err(e) => Err(ToolError::Execution(e.to_string())),
                },
                None => Err(ToolError::Execution(format!("Adapter '{name}' not found."))),
            }
        }
    }
}

// ── AdapterStopTool ──

pub struct AdapterStopTool {
    adapters: Arc<AdapterRegistry>,
}

impl AdapterStopTool {
    pub fn new(adapters: Arc<AdapterRegistry>) -> Self {
        Self { adapters }
    }
}

#[async_trait]
impl Tool for AdapterStopTool {
    fn name(&self) -> &str { "adapter_stop" }
    fn description(&self) -> &str {
        "Stop a running platform adapter (e.g. QQ). Use 'all' to stop all running adapters."
    }
    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Adapter name: 'qq' or 'all'"}
            },
            "required": ["name"]
        })
    }
    async fn execute(&self, args: Value) -> Result<String, ToolError> {
        let name = args["name"].as_str().unwrap_or("all").to_lowercase();
        if name == "all" {
            self.adapters.stop_all().await;
            Ok("All adapters stopped.".into())
        } else {
            match self.adapters.get(&name) {
                Some(adapter) => match adapter.stop().await {
                    Ok(()) => Ok(format!("{} adapter stopped.", adapter.display_name())),
                    Err(e) => Err(ToolError::Execution(e.to_string())),
                },
                None => Err(ToolError::Execution(format!("Adapter '{name}' not found."))),
            }
        }
    }
}

// ── AdapterRestartTool ──

pub struct AdapterRestartTool {
    adapters: Arc<AdapterRegistry>,
}

impl AdapterRestartTool {
    pub fn new(adapters: Arc<AdapterRegistry>) -> Self {
        Self { adapters }
    }
}

#[async_trait]
impl Tool for AdapterRestartTool {
    fn name(&self) -> &str { "adapter_restart" }
    fn description(&self) -> &str {
        "Restart a platform adapter (stop then start). Useful when the adapter is not responding."
    }
    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Adapter name, e.g. 'qq'"}
            },
            "required": ["name"]
        })
    }
    async fn execute(&self, args: Value) -> Result<String, ToolError> {
        let name = args["name"].as_str().unwrap_or("qq").to_lowercase();
        match self.adapters.get(&name) {
            Some(adapter) => {
                // Stop then start.
                if adapter.stop().await.is_err() {
                    // Not running — just start.
                }
                match adapter.start().await {
                    Ok(()) => Ok(format!("{} adapter restarted.", adapter.display_name())),
                    Err(e) => Err(ToolError::Execution(e.to_string())),
                }
            }
            None => Err(ToolError::Execution(format!("Adapter '{name}' not found."))),
        }
    }
}

// ── Registration ──

pub fn register_adapter_tools(registry: &mut ToolRegistry, adapters: Arc<AdapterRegistry>) {
    registry.register(Arc::new(AdapterStatusTool::new(adapters.clone())));
    registry.register(Arc::new(AdapterStartTool::new(adapters.clone())));
    registry.register(Arc::new(AdapterStopTool::new(adapters.clone())));
    registry.register(Arc::new(AdapterRestartTool::new(adapters.clone())));
}
