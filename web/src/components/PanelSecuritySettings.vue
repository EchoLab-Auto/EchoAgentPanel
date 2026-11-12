<script setup lang="ts">
//! 「设置 · 面板」→ 安全（2026-11）：访问令牌 + 是否强制认证。
//!
//! ## 为什么放到面板设置里
//!
//! 这两件事此前只能改 `panel.toml` 再重启：令牌是 `[server] access_token`，
//! 而"是否生效"由"非空"隐式决定。于是最需要它的两个场景都做不到——
//! 令牌泄漏要立刻轮换（不能等重启），以及"先把令牌配好、各处都拿到再统一
//! 开认证"（用非空即生效就只能一步锁门）。
//!
//! 后端把两者拆开（`GET/POST /api/security`，见 `echo-web-server::security`），
//! 这里只做表单与状态呈现。
//!
//! ## 三条必须讲清楚的事实（都在界面上说）
//!
//! 1. **令牌只回摘要**：读接口不回明文。要拿到新令牌只有"生成"这条路，
//!    且生成的值只显示这一次——所以生成后必须先写进 localStorage 再让用户
//!    复制走（本组件把当前浏览器同步好了，用户再拷给别人）。
//! 2. **改令牌会踢掉已连接的浏览器**：包括当前这个（它随即用新令牌重连，
//!    视觉上只是"闪一下"）。别处没拿到新令牌的浏览器会停在 401 页面。
//! 3. **认证开关与令牌分开**：有令牌但开关关着 = 不拦截；开关开着但没令牌
//!    = 也不拦截（否则会把人锁在门外），界面此时明确警告"认证不会生效"。

import { computed, onMounted, ref } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import { useToast } from '@echolab-auto/ui-frame/composables/useToast';
import { panelFetch } from '../connection';
import { confirmDialog } from '../confirm';

const { addToast } = useToast();

/** `GET /api/security` 的回答（后端 `SecurityView`，**不含令牌明文**）。 */
interface SecurityView {
  token_set: boolean;
  token_hint: string;
  require_token: boolean;
  enforced: boolean;
  bind_address: string;
  loopback: boolean;
  config_writable: boolean;
}

interface SecurityUpdateResponse extends SecurityView {
  token_once?: string;
  persisted: boolean;
}

const TOKEN_STORAGE_KEY = 'echo-panel-token';
const MIN_TOKEN_LEN = 16;

const loading = ref(true);
const saving = ref(false);
const view = ref<SecurityView | null>(null);
const error = ref('');

/** 新令牌输入（空 = 不改）。 */
const draft = ref('');
/** 是否显示明文（默认掩码）。 */
const reveal = ref(false);
/** 刚生成的令牌：只在本页存在，用于提示用户复制走。 */
const freshlyGenerated = ref('');
/** 上次保存是否**没能**写回配置文件。toast 会消失，这条要一直挂着。 */
const unpersisted = ref(false);

const enforced = computed(() => view.value?.enforced === true);
/** "想开但没令牌"——必须显式警告，否则用户以为门锁上了。 */
const requireWithoutToken = computed(
  () => view.value?.require_token === true && view.value?.token_set === false,
);
const exposedWithoutAuth = computed(
  () => view.value !== null && !view.value.loopback && !enforced.value,
);
/** 输入够长才能保存（与服务端同一条规则，先在本地拦住）。 */
const draftTooShort = computed(
  () => draft.value.length > 0 && draft.value.trim().length < MIN_TOKEN_LEN,
);
const canSave = computed(() => !saving.value && !draftTooShort.value && draft.value.trim() !== '');

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const res = await panelFetch('/api/security');
    if (!res.ok) {
      error.value = res.status === 401 ? '当前凭据已失效，请刷新页面重新登录' : `读取失败（HTTP ${res.status}）`;
      return;
    }
    view.value = (await res.json()) as SecurityView;
    // 重新读到服务端事实后，旧的"仅本次生效"提示不再成立。
    unpersisted.value = false;
  } catch (e) {
    error.value = `读取失败：${(e as Error).message}`;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/**
 * 把新令牌写进本浏览器的 localStorage。
 *
 * 这是**关键一步**：后端轮换后会在 2s 内断开所有中继连接（含当前这条），
 * 前端随即自动重连——重连读的就是这个键。不先写进来，保存完就等于把自己
 * 锁在门外。
 */
function adopt(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    addToast({ message: '无法写入本地存储（隐私模式？），刷新后需要手动带 ?token= 打开', type: 'error', duration: 6000 });
  }
}

/** 提交一次变更。`body` 只带要改的字段（服务端语义是"只改我给了的"）。 */
async function submit(body: Record<string, unknown>): Promise<SecurityUpdateResponse | null> {
  saving.value = true;
  error.value = '';
  try {
    const res = await panelFetch('/api/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as
      | (SecurityUpdateResponse & { error?: string })
      | { error?: string };
    if (!res.ok) {
      error.value = ('error' in payload && payload.error) || `保存失败（HTTP ${res.status}）`;
      return null;
    }
    const saved = payload as SecurityUpdateResponse;
    view.value = saved;
    return saved;
  } catch (e) {
    error.value = `保存失败：${(e as Error).message}`;
    return null;
  } finally {
    saving.value = false;
  }
}

function reportPersisted(saved: SecurityUpdateResponse): void {
  unpersisted.value = !saved.persisted;
  if (!saved.persisted) {
    addToast({
      message: '已生效，但没有可写回的配置文件：本次改动只在当前进程内有效，重启后恢复',
      type: 'warning',
      duration: 8000,
    });
  }
}

/** 生成新令牌并立即启用认证（一步到位，生成值只显示这一次）。 */
async function generate(): Promise<void> {
  const ok = await confirmDialog(
    '生成新令牌并立即启用访问令牌认证。\n\n'
      + '· 新令牌只显示这一次，请立刻复制保存；\n'
      + '· 已连接的浏览器会被断开重连（包括当前页面）；\n'
      + '· 其他设备上的面板需要用新令牌重新打开。',
    { title: '生成访问令牌', confirmText: '生成并启用' },
  );
  if (!ok) return;
  const saved = await submit({ generate: true, require_token: true });
  if (!saved?.token_once) return;
  freshlyGenerated.value = saved.token_once;
  reveal.value = true;
  draft.value = '';
  adopt(saved.token_once);
  addToast({ message: '已生成新令牌并启用认证；当前浏览器已同步', type: 'success', duration: 5000 });
  reportPersisted(saved);
}

/** 保存手填的令牌（不改开关）。 */
async function saveToken(): Promise<void> {
  const token = draft.value.trim();
  if (!token) return;
  const ok = await confirmDialog(
    '保存新令牌？已连接的浏览器会被断开重连，其他地方需要用新令牌重新打开。',
    { title: '轮换访问令牌', confirmText: '保存' },
  );
  if (!ok) return;
  const saved = await submit({ token });
  if (!saved) return;
  adopt(token);
  draft.value = '';
  freshlyGenerated.value = '';
  addToast({ message: '令牌已更新；当前浏览器已同步', type: 'success', duration: 5000 });
  reportPersisted(saved);
}

/** 切换"是否强制认证"。 */
async function toggleRequire(next: boolean): Promise<void> {
  if (next && !view.value?.token_set) {
    // 没令牌就开强制：服务端会拒绝（`enforced` 恒 false），这里先讲清楚。
    addToast({ message: '请先设置访问令牌，再启用认证', type: 'error', duration: 5000 });
    return;
  }
  if (next) {
    const ok = await confirmDialog(
      '启用访问令牌认证后，未携带令牌的浏览器将无法连接（含 WS 与 HTTP API）。\n'
        + '当前浏览器已持有令牌，不受影响。',
      { title: '启用访问令牌认证', confirmText: '启用' },
    );
    if (!ok) return;
  }
  const saved = await submit({ require_token: next });
  if (!saved) return;
  addToast({
    message: next ? '已启用访问令牌认证' : '已关闭访问令牌认证（凭据仍保留）',
    type: 'success',
    duration: 4000,
  });
  reportPersisted(saved);
}

/** 清空令牌（同时关掉强制认证——否则会变成"谁都进不去"）。 */
async function clearToken(): Promise<void> {
  const ok = await confirmDialog(
    '清空访问令牌？认证会同时关闭，任何能访问面板端口的人都可以直接连入。',
    { title: '清空访问令牌', confirmText: '清空', danger: true },
  );
  if (!ok) return;
  const saved = await submit({ token: '', require_token: false });
  if (!saved) return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // 存储不可用：无所谓，令牌已经没了
  }
  freshlyGenerated.value = '';
  addToast({ message: '令牌已清空，认证已关闭', type: 'success', duration: 5000 });
  reportPersisted(saved);
}

async function copyToken(token: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(token);
    addToast({ message: '已复制到剪贴板', type: 'success', duration: 3000 });
  } catch {
    addToast({ message: '复制失败，请手动选中复制', type: 'error', duration: 5000 });
  }
}
</script>

<template>
  <div class="sec-page">
    <div class="sec-header">
      <div>
        <div class="sec-title">安全</div>
        <div class="sec-sub">
          面板自身的访问控制：浏览器经 <code>Authorization: Bearer</code> 或
          <code>?token=</code> 出示令牌。改完即时生效，不必重启。
        </div>
      </div>
      <NeumorphismButton size="small" variant="glass" :loading="loading" @click="load">
        刷新
      </NeumorphismButton>
    </div>

    <NeumorphismCard v-if="error" variant="pressed" class="sec-error">{{ error }}</NeumorphismCard>

    <template v-if="view">
      <!-- 当前状态 -->
      <NeumorphismCard class="sec-card" :elevation="2">
        <div class="sec-row">
          <span class="sec-row__label">认证状态</span>
          <NeumorphismTag :variant="enforced ? 'success' : 'error'">
            {{ enforced ? '已启用' : '未启用' }}
          </NeumorphismTag>
        </div>
        <div class="sec-row">
          <span class="sec-row__label">访问令牌</span>
          <span v-if="view.token_set" class="sec-mono">{{ view.token_hint }}</span>
          <NeumorphismTag v-else variant="error">未设置</NeumorphismTag>
        </div>
        <div class="sec-row">
          <span class="sec-row__label">监听地址</span>
          <span class="sec-mono">{{ view.bind_address || '（未知）' }}</span>
          <NeumorphismTag :variant="view.loopback ? 'default' : 'warning'">
            {{ view.loopback ? '仅本机' : '对外可达' }}
          </NeumorphismTag>
        </div>
        <div class="sec-row">
          <span class="sec-row__label">配置写回</span>
          <span class="sec-muted">{{ view.config_writable ? '改动会写回 panel.toml' : '无配置文件，改动仅本次运行有效' }}</span>
        </div>

        <!-- 两种"看起来配好了、其实没锁门"的状态必须显式警告 -->
        <div v-if="requireWithoutToken" class="sec-warn">
          已勾选「要求访问令牌」，但<strong>还没有设置令牌</strong> —— 认证不会生效。请先设置令牌。
        </div>
        <div v-else-if="exposedWithoutAuth" class="sec-warn">
          面板监听在非回环地址上，且当前<strong>没有</strong>访问认证 —— 任何能访问
          该端口的人都可以直接控制你的 Agent。
        </div>

        <!-- toast 会消失，但"改完重启就没了"是必须一直看见的事实 -->
        <div v-if="unpersisted" class="sec-warn">
          本次改动<strong>只在当前进程内有效</strong>：这个形态没有可写回的配置文件
          （独立 Panel 用 <code>panel.toml</code>；内嵌形态需在模块配置里指向
          <code>config_file</code>），重启后会恢复原值。
        </div>
      </NeumorphismCard>

      <!-- 开关 -->
      <NeumorphismCard class="sec-card" :elevation="2">
        <div class="sec-switch-row">
          <div>
            <div class="sec-switch-row__label">要求访问令牌认证</div>
            <div class="sec-switch-row__desc">
              WS 与 HTTP API 都要求令牌；静态前端资源不受限（否则连登录页都打不开）。
              令牌可先存着不开认证——方便先把各处浏览器配好再统一启用。
            </div>
          </div>
          <NeumorphismSwitch
            :model-value="view.require_token"
            :disabled="saving"
            @update:model-value="toggleRequire"
          />
        </div>
      </NeumorphismCard>

      <!-- 令牌 -->
      <NeumorphismCard class="sec-card" :elevation="2">
        <div class="sec-section-title">访问令牌</div>

        <div v-if="freshlyGenerated" class="sec-generated">
          <div class="sec-generated__head">新令牌（只显示这一次，请立刻保存）</div>
          <div class="sec-generated__body">
            <code class="sec-generated__token">{{ reveal ? freshlyGenerated : '••••••••••••••••••••' }}</code>
            <NeumorphismButton size="small" variant="glass" @click="reveal = !reveal">
              {{ reveal ? '隐藏' : '显示' }}
            </NeumorphismButton>
            <NeumorphismButton size="small" @click="copyToken(freshlyGenerated)">复制</NeumorphismButton>
          </div>
        </div>

        <label class="sec-field">
          <span class="sec-field__label">
            {{ view.token_set ? '换成新令牌（留空 = 不改）' : '设置访问令牌' }}
          </span>
          <div class="sec-field__inline">
            <NeumorphismInput
              v-model="draft"
              :type="reveal ? 'text' : 'password'"
              placeholder="至少 16 位，建议用「生成随机令牌」"
              autocomplete="new-password"
            />
            <NeumorphismButton size="small" variant="glass" @click="reveal = !reveal">
              {{ reveal ? '隐藏' : '显示' }}
            </NeumorphismButton>
            <NeumorphismButton size="small" variant="primary" :loading="saving" :disabled="!canSave" @click="saveToken">
              保存
            </NeumorphismButton>
          </div>
        </label>
        <div v-if="draftTooShort" class="sec-hint sec-hint--error">
          至少 {{ MIN_TOKEN_LEN }} 位：面板端口常被映射到公网，短令牌是分钟级可枚举的。
        </div>
        <div v-else class="sec-hint">
          令牌只以摘要形式显示（<span class="sec-mono">{{ view.token_hint || '—' }}</span>），
          服务端不回明文。换个浏览器/设备打开面板时，用
          <code>https://…/?token=&lt;令牌&gt;</code> 首访一次即可（之后存在本地）。
        </div>

        <div class="sec-actions">
          <NeumorphismButton size="small" :loading="saving" @click="generate">
            生成随机令牌
          </NeumorphismButton>
          <NeumorphismButton
            v-if="view.token_set"
            size="small"
            variant="glass"
            :loading="saving"
            @click="clearToken"
          >
            清空令牌
          </NeumorphismButton>
        </div>
      </NeumorphismCard>

      <!-- 影响面：改写令牌/开关会发生什么 -->
      <NeumorphismCard class="sec-card sec-card--note" variant="pressed">
        <div class="sec-note-title">改动的实际影响</div>
        <ul class="sec-note-list">
          <li><strong>轮换令牌</strong>会断开所有已连接的中继（含当前页面），各浏览器自动用新令牌重连；
            没拿到新令牌的设备会停在「未授权」。</li>
          <li><strong>只切换开关</strong>不会断开现有连接——正在用的页面不受影响，仅影响新连接。</li>
          <li><strong>清空令牌</strong>会同时关掉认证（否则就成了谁都进不去），改回干净状态。</li>
          <li>认证只管 Panel 这一层：上游 Core 各自有自己的 <code>management_access_token</code>，
            在「Core 连接」页配置。</li>
        </ul>
      </NeumorphismCard>
    </template>

    <NeumorphismCard v-else-if="loading" class="sec-card" variant="pressed">
      正在读取安全设置…
    </NeumorphismCard>
  </div>
</template>

<style scoped>
.sec-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  padding: 4px 2px 24px;
}

.sec-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sec-title {
  font-size: 16px;
  font-weight: 600;
}

.sec-sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-secondary, #888);
}

.sec-error {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--nm-danger, #e5484d);
}

.sec-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.sec-row__label {
  flex: 0 0 96px;
  color: var(--nm-text-secondary, #888);
}

.sec-mono {
  font-family: var(--nm-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
}

.sec-muted {
  color: var(--nm-text-secondary, #888);
  font-size: 12px;
}

.sec-warn {
  margin-top: 2px;
  padding: 10px 12px;
  border-left: 3px solid var(--nm-warning, #f5a524);
  border-radius: 6px;
  background: color-mix(in srgb, var(--nm-warning, #f5a524) 12%, transparent);
  font-size: 12px;
  line-height: 1.6;
}

.sec-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.sec-switch-row__label {
  font-size: 13px;
  font-weight: 600;
}

.sec-switch-row__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-secondary, #888);
  max-width: 560px;
}

.sec-section-title {
  font-size: 13px;
  font-weight: 600;
}

.sec-generated {
  border: 1px dashed var(--nm-border, #3a3f4b);
  border-radius: 8px;
  padding: 10px 12px;
}

.sec-generated__head {
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-warning, #f5a524);
  margin-bottom: 8px;
}

.sec-generated__body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sec-generated__token {
  flex: 1 1 320px;
  font-family: var(--nm-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  word-break: break-all;
  user-select: all;
}

.sec-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sec-field__label {
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
}

.sec-field__inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sec-field__inline > :first-child {
  flex: 1 1 260px;
  min-width: 180px;
}

.sec-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-secondary, #888);
}

.sec-hint--error {
  color: var(--nm-danger, #e5484d);
}

.sec-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sec-card--note {
  gap: 8px;
}

.sec-note-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary, #888);
}

.sec-note-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--nm-text-secondary, #888);
}

code {
  font-family: var(--nm-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.95em;
}
</style>
