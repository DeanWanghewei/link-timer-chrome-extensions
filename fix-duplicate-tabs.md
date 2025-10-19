# 修复链接重复打开问题

## 问题原因分析

### 为什么会打开多个tab？

1. **孤立的Chrome Alarms残留**
   - Chrome的`alarms` API会持久化保存定时任务
   - 即使扩展重新加载、更新或卸载，旧的alarm可能仍然存在
   - 每个alarm触发时都会打开一个新tab

2. **导入配置时创建重复alarm**
   - 在`options.js:402-406`，导入配置时会对每个链接调用`UPDATE_LINK`
   - 这会为每个链接创建新的alarm，但可能不会清理旧的alarm
   - 导致同一个链接有多个alarm

3. **扩展更新时未清理旧alarm**
   - 之前的代码在扩展安装或更新时没有清理旧alarm
   - 导致新旧alarm同时存在

## 解决方案

### 安全性保证

⚠️ **重要：不会误删其他扩展的alarm**

清理机制使用了alarm命名规则识别：
- 本扩展的alarm名称格式：**纯数字的timestamp字符串**（如 `1234567890123`）
- 清理时只会删除符合此格式的alarm
- 其他扩展的alarm（包含字母、符号等）会被保留
- 正则表达式：`/^\d+$/`

### 1. 用户主导的清理机制（已实现）

**重要改进：清理由用户主动发起，而不是自动执行**

在`background.js`中添加了以下功能：

#### a) 检查Alarms状态（不执行清理）
```javascript
// 新增 CHECK_ALARMS 消息类型
// 返回所有alarm的详细信息，包括：
// - 本扩展的alarms
// - 其他扩展的alarms（不会被清理）
// - 孤立的alarms（不在管理列表中）
async function checkAlarms() {
  // 分类并返回alarm信息
}
```

#### b) 孤立alarm自动检测和清除
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  getLinks().then((links) => {
    const link = links[alarm.name];
    if (!link) {
      // 如果找不到对应的链接，清除这个孤立的alarm
      console.warn(`发现孤立的alarm: ${alarm.name}，已清除`);
      chrome.alarms.clear(alarm.name);
    }
    // ...其他处理...
  });
});
```

#### c) 非重复任务自动删除
```javascript
// 非重复任务触发后自动删除
if (!link.repeatDaily) {
  deleteLink(alarm.name);
}
```

#### d) 清理和重建函数（安全版本）
```javascript
async function cleanupAndRebuildAlarms() {
  // 1. 获取所有现有alarms
  // 2. 获取所有有效链接
  // 3. 识别属于本扩展的alarms（通过正则 /^\d+$/）
  // 4. 只清除本扩展的alarms，保护其他扩展
  // 5. 为有效链接重新创建alarms
  // 6. 记录详细日志
}
```

### 2. 检查Alarms按钮（已实现）

在扩展管理页面添加了"检查Alarms"按钮：

- 位置：`chrome://extensions/` → Link Timer → 选项
- 功能：分两步执行
  1. **第一步：检查并显示信息**
     - 显示总alarm数量
     - 显示本扩展的alarm数量
     - **显示其他扩展的alarm列表（不会被清理）**
     - **显示孤立的alarm列表（不在管理列表中）**
  2. **第二步：用户确认后清理**
     - 明确告知将要执行的操作
     - 让用户确认是否继续
     - 只有用户确认后才执行清理

### 3. 清理脚本（可选）

提供了`cleanup-script.js`文件，可以在浏览器控制台手动执行：

1. 打开`chrome://extensions/`
2. 找到Link Timer扩展，点击"service worker"
3. 复制`cleanup-script.js`的内容粘贴到控制台
4. 查看详细的清理日志

## 使用方法

### 方法1：使用检查Alarms按钮（推荐）

1. 右键点击Link Timer扩展图标
2. 选择"选项"
3. 点击"🧹 检查Alarms"按钮
4. **查看第一个弹窗**，显示：
   - 总alarm数量
   - 本扩展的alarm数量
   - 其他扩展的alarm列表（会被保护）
   - 孤立的alarm列表（不在管理列表中）
5. **如果有孤立的alarm**，会弹出第二个确认对话框：
   - 显示即将执行的具体操作
   - 明确说明哪些alarm会被保留
   - 用户确认后才执行清理
6. **如果没有孤立的alarm**，显示"没有发现孤立的Alarm"，无需清理

### 方法2：使用清理脚本（开发者）

1. 打开`chrome://extensions/`
2. 开启"开发者模式"
3. 找到Link Timer扩展，点击"service worker"
4. 打开`cleanup-script.js`文件
5. 复制全部内容粘贴到控制台执行
6. **脚本会先显示详细信息**：
   - 其他扩展的alarm（不会被清除）
   - 孤立的alarm列表
7. **用户确认后**才执行清理
8. 查看详细的清理日志

## 验证修复

### 检查当前alarm数量

在service worker控制台执行：
```javascript
chrome.alarms.getAll().then(alarms => {
  console.log(`当前alarm数量: ${alarms.length}`);
  alarms.forEach(alarm => {
    console.log(`- ${alarm.name}`);
  });
});
```

### 检查链接数量

在service worker控制台执行：
```javascript
chrome.storage.local.get('links').then(result => {
  const links = result.links || {};
  console.log(`当前链接数量: ${Object.keys(links).length}`);
});
```

### 正常情况

- alarm数量应该等于或小于链接数量
- 每个有效的、未过期的链接应该有一个对应的alarm
- 不应该有孤立的alarm（没有对应链接的alarm）

## 预防措施

### 导入配置时的注意事项

1. 导入前先导出当前配置作为备份
2. 导入后会自动为所有链接创建alarm
3. 如果担心重复，可以在导入后点击"清理历史配置"

### 日常使用建议

1. 定期检查alarm数量是否异常
2. 如果发现重复打开问题，立即使用清理功能
3. 扩展更新后第一次使用时，建议手动清理一次

## 技术细节

### Chrome Alarms API特性

- **持久化**: alarm会保存在浏览器中，重启后仍然存在
- **命名**: 每个alarm有一个唯一的名称（本扩展使用链接ID）
- **触发**: alarm触发时会调用`chrome.alarms.onAlarm`监听器
- **清理**: 必须手动调用`chrome.alarms.clear(name)`来删除

### 本扩展的alarm命名规则

- alarm名称 = 链接ID（纯数字timestamp字符串）
- 格式：`/^\d+$/`（只包含数字，如 `1234567890123`）
- 一对一映射：每个链接有且仅有一个alarm
- 通过名称可以快速查找对应的链接

### 如何区分本扩展和其他扩展的alarm

- **本扩展**：`1234567890123`（纯数字）
- **其他扩展示例**：
  - `reminder_daily`（包含字母和下划线）
  - `sync-alarm-v2`（包含连字符）
  - `check.updates`（包含点号）

清理时使用正则表达式 `/^\d+$/` 匹配，只处理纯数字命名的alarm。

## 更新日志

### v1.3
- ✅ 添加了`checkAlarms()`函数 - 检查alarm状态但不执行清理
- ✅ 添加了`cleanupAndRebuildAlarms()`函数 - 清理和重建alarms
- ✅ **移除自动清理** - 不再在扩展安装时自动清理，改为用户主动发起
- ✅ 添加了孤立alarm的自动检测
- ✅ 在options页面添加了"检查Alarms"按钮
- ✅ **两步确认流程**：
  1. 第一步：显示详细信息（其他扩展的alarm、孤立的alarm）
  2. 第二步：用户确认后才执行清理
- ✅ 提供了独立的清理脚本工具（包含用户确认）
- ✅ 非重复任务触发后自动删除
- ✅ **安全性改进**：
  - 只清理本扩展的alarm（使用正则 `/^\d+$/` 识别）
  - 保护其他扩展的alarm不被误删
  - 清理前显示其他扩展的alarm列表
  - 用户确认后才执行操作

## 常见问题

### Q: 点击"检查Alarms"按钮会发生什么？
A: 按钮会先显示详细的检查结果，包括：
- 所有alarm的分类统计
- 其他扩展的alarm列表（不会被清理）
- 孤立的alarm列表（不在管理列表中）
- 只有发现孤立alarm时，才会询问是否清理
- 用户确认后才会执行清理操作

### Q: 清理会删除我的链接数据吗？
A: **不会**。清理只会删除和重建alarm（定时任务），不会影响保存的链接数据。链接数据保存在chrome.storage中，不会被修改。

### Q: 清理后还会重复打开吗？
A: 如果是因为孤立alarm导致的重复打开，清理后应该不会再出现。清理会移除所有孤立的alarm并为每个链接重新创建一个alarm。

### Q: 多久清理一次比较好？
A: 通常不需要定期清理。只在发现重复打开问题时点击"检查Alarms"按钮即可。如果没有孤立的alarm，系统会提示无需清理。

### Q: 如何确认清理成功？
A: 清理成功后会显示详细的统计信息：
- 清除了多少个孤立的alarm
- 为多少个链接重新创建了alarm
- 保留了多少个其他扩展的alarm

### Q: 清理脚本和清理按钮有什么区别？
A: 功能相同，但清理脚本会在控制台显示更详细的步骤日志。两者都会在清理前显示详细信息并要求用户确认。

### Q: 会不会误删其他Chrome扩展的alarm？
A: **不会**。清理机制使用正则表达式 `/^\d+$/` 识别本扩展的alarm（纯数字格式）。其他扩展的alarm（通常包含字母、符号）会被识别并保留。清理脚本会显示其他扩展的alarm列表以供确认。

### Q: 如何验证不会误删其他扩展的alarm？
A: 运行清理脚本时，会在步骤3显示"其他扩展的任务列表"。这些任务不会被清除。你可以在清理前后对比alarm列表确认。
