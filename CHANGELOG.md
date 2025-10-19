# 更新日志 (Changelog)

## [1.5] - 2025-01-18

### 🐛 重大修复 (Critical Fix)
- **彻底修复链接重复打开问题** - 解决了竞态条件导致的 alarm 重复创建
  - 将 `createAlarm()` 函数改为 async/await 模式 (background.js:213-242)
  - 移除 `updateLink()` 中的双重清除逻辑，避免竞态条件
  - 所有调用 `createAlarm` 的地方都使用 await 确保顺序执行
  - 修复重复任务触发时的循环创建问题

### ✨ 新增 (Added)
- **开关式 Alarm 控制** - 用开关替代删除按钮，更直观易用
  - 添加美观的滑动开关 UI 组件 (options.html:223-275)
  - 新增 `alarmEnabled` 字段用于记录 alarm 启用状态
  - 新增 `TOGGLE_ALARM` 消息处理器 (background.js:97-104)
  - 新增 `toggleAlarm()` 函数支持启用/禁用 alarm (background.js:156-184)

### 🔧 改进 (Improved)
- **正确理解 Chrome Alarms 隔离机制**
  - 移除错误的"其他扩展 alarm"分类逻辑
  - 简化 `checkAlarms()` 函数，只返回有效和孤立的 alarm (background.js:283-334)
  - 更新统计信息显示，添加提示说明 alarms 隔离机制 (options.js:520-532)

- **异步处理优化**
  - `createAlarm()` 返回 Promise，确保清除和创建操作顺序执行
  - `saveLink()` 等待 alarm 创建完成 (background.js:130)
  - `toggleAlarm()` 等待 alarm 创建完成 (background.js:172)
  - `cleanupAndRebuildAlarms()` 使用 await 确保顺序重建 (background.js:375)

- **尊重 alarmEnabled 状态**
  - 重建 alarm 时检查 `alarmEnabled` 字段 (background.js:374)
  - 禁用的 alarm 不会被重建

### 🗑️ 移除 (Removed)
- 移除 `DELETE_ALARM` 消息处理器（被 `TOGGLE_ALARM` 替代）
- 移除错误的"其他扩展 alarm"统计和显示逻辑

### 🛡️ 技术改进 (Technical)
**修复前的问题**：
```javascript
// ❌ 错误：双重清除导致竞态条件
chrome.alarms.clear(id);  // 不等待
createAlarm(id, ...);     // 立即调用，内部又清除一次
```

**修复后**：
```javascript
// ✅ 正确：单次清除，顺序执行
async function createAlarm(id, ...) {
  await chrome.alarms.clear(id);  // 等待清除完成
  await chrome.alarms.create(...); // 然后创建
}
```

### 📚 文档更新 (Documentation)
- 更新 `ALARM_MANAGEMENT.md` 说明 Chrome alarms 隔离机制

---

## [1.4] - 2025-01-18

### 🐛 修复 (Fixed)
- **修复链接重复打开问题** - 彻底解决定时任务触发时打开多个相同页面的问题
  - 在 `createAlarm()` 函数中添加自动清除旧 alarm 的逻辑 (background.js:168-190)
  - 防止导入配置、更新链接时创建重复的 alarm
  - 避免竞态条件导致的 alarm 累积

### ✨ 新增 (Added)
- **单独删除 Alarm 功能**
  - 在选项页面每个链接项添加"删除Alarm"按钮 (options.js:239)
  - 新增 `DELETE_ALARM` 消息处理器 (background.js:97-107)
  - 支持删除定时任务但保留链接数据，方便调试和特殊场景

### 🔧 改进 (Improved)
- **增强删除链接时的 Alarm 清理**
  - 添加清理状态的日志反馈 (background.js:147-153)
  - 记录清理成功或失败的详细信息

- **优化 Alarm 检查统计信息显示**
  - 使用树状结构清晰展示 alarm 分类 (options.js:513-523)
  - 明确区分：总数、本扩展的（有效的 + 孤立的）、其他扩展的
  - 修复统计数据重复和容易误解的问题

- **改进日志系统**
  - 所有 alarm 操作都添加详细的控制台日志
  - 包括创建、清除、删除等操作的状态反馈

### 📚 文档 (Documentation)
- 新增 `ALARM_MANAGEMENT.md` - Alarm 管理详细说明文档
  - 使用场景和操作指南
  - 调试和验证方法
  - 技术实现细节
  - 常见问题解答

### 🛡️ 防护机制 (Protection)
现在具有**五层防护机制**防止重复打开页面：
1. **第一层**: createAlarm 自动清除 - 创建/更新时自动预防
2. **第二层**: deleteLink 确保清除 - 删除链接时清理
3. **第三层**: 孤立 alarm 检测 - alarm 触发时自动清理
4. **第四层**: 批量清理功能 - 用户手动清理历史问题
5. **第五层**: 单独删除按钮 - 精细控制特定 alarm

---

## [1.3] - 2024-10-13

### ✨ 新增
- 链接自动关闭功能，支持自定义延迟时间
- 分组管理功能，支持按组分类链接
- 导入导出配置功能
- 分组建议和自动补全功能

### 🔧 改进
- 优化链接打开逻辑，支持自动关闭标签页
- 改进链接列表展示，按分组和时间排序
- 更新上下文菜单标题和版本号

---

## [1.0] - 2024-09-17

### ✨ 初始版本
- 基本的定时链接管理功能
- 右键菜单添加链接
- 支持每天重复提醒
- 弹窗和选项页面界面
