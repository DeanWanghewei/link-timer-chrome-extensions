# 修复重复 Alarm 问题

## 根本原因
找到了！在 `background.js` 的 `chrome.alarms.onAlarm.addListener` 中有一个**严重的 bug**：

### 错误的代码（已修复）
```javascript
// ❌ 错误的逻辑
if (link.repeatDaily) {
  const nextTime = new Date(link.scheduledTime);
  nextTime.setDate(nextTime.getDate() + 1);
  link.scheduledTime = nextTime.toISOString();
  updateLink(link);  // ⚠️ 这会创建新的 alarm！
}
```

### 问题说明
1. **Chrome alarms 本身已经处理了重复**
   - 创建 alarm 时使用了 `periodInMinutes: 24 * 60`
   - Chrome 会自动每24小时触发一次

2. **代码又调用了 `updateLink(link)`**
   - `updateLink` 内部会调用 `createAlarm`
   - 每次触发后都会**额外创建一个新的 alarm**
   - 导致 alarm 数量呈指数增长！

3. **结果**
   - 第1天：1个 alarm → 触发后变成 2个
   - 第2天：2个 alarm → 触发后变成 4个
   - 第3天：4个 alarm → 触发后变成 8个
   - 第4天：8个 alarm → 触发后变成 16个
   - ...以此类推！

这就是为什么你会看到链接重复打开越来越多次的原因！

### 正确的代码（已修复）
```javascript
// ✅ 正确的逻辑
if (!link.repeatDaily) {
  deleteLink(alarm.name);  // 只删除非重复任务
}
// repeatDaily 任务由 Chrome 自动处理，无需额外操作
```

## 立即修复步骤

### 步骤 1: 完全清理当前的混乱状态

在扩展选项页面打开控制台（F12），运行：

```javascript
// 1. 先导出当前配置做备份（如果需要）
chrome.runtime.sendMessage({ type: "GET_LINKS" }, (response) => {
  const links = Object.values(response.links || {});
  console.log('当前配置:', JSON.stringify(links, null, 2));
  // 复制控制台输出保存为 backup.json
});

// 2. 完全清空
chrome.storage.local.clear(() => {
  console.log('✅ Storage 已清空');
});

chrome.alarms.clearAll(() => {
  console.log('✅ 所有 alarms 已清空');
});
```

### 步骤 2: 重新加载扩展

1. 打开 Chrome 扩展管理页面：`chrome://extensions/`
2. 找到"定时链接管理器"
3. 点击刷新按钮（🔄）重新加载扩展

### 步骤 3: 重新导入配置

1. 关闭之前的选项页，重新打开
2. 点击"导入配置"按钮
3. 选择你的配置文件

### 步骤 4: 验证修复

在控制台运行验证脚本：

```javascript
// 验证是否正常
chrome.storage.local.get('links', (result) => {
  const links = result.links || {};
  const linkCount = Object.keys(links).length;

  chrome.alarms.getAll((alarms) => {
    console.log('\n=== 验证结果 ===');
    console.log(`链接数量: ${linkCount}`);
    console.log(`Alarm 数量: ${alarms.length}`);

    if (linkCount === alarms.length) {
      console.log('✅ 数量一致，看起来正常！');
    } else {
      console.log('⚠️  数量不一致，可能需要使用"检查Alarms"按钮清理');
    }

    // 显示详细信息
    console.log('\n=== Alarms 详情 ===');
    alarms.forEach(alarm => {
      const link = links[alarm.name];
      console.log(`\nAlarm: ${alarm.name}`);
      console.log(`  标题: ${link ? link.title : '未找到对应链接'}`);
      console.log(`  触发时间: ${new Date(alarm.scheduledTime).toLocaleString()}`);
      console.log(`  重复周期: ${alarm.periodInMinutes ? `${alarm.periodInMinutes}分钟` : '一次性'}`);
    });
  });
});
```

## 预防措施

### 1. 使用"检查 Alarms"功能
导入配置后，建议立即点击"检查 Alarms"按钮：
- 检查是否有孤立的 alarm
- 确认 alarm 数量是否正常
- 必要时执行清理

### 2. 定期检查
建议每周检查一次 alarm 状态，确保没有累积重复。

### 3. 监控日志
在扩展选项页面，打开控制台，可以看到：
- 创建 alarm 的日志
- 触发 alarm 的日志
- 清除 alarm 的日志

如果看到同一个链接被多次触发，说明有重复 alarm。

## 技术说明

### Chrome Alarms API 的 repeatDaily 机制

```javascript
// 创建重复任务
chrome.alarms.create(id, {
  when: scheduledTime,        // 首次触发时间
  periodInMinutes: 24 * 60    // 每24小时重复一次
});

// ✅ Chrome 会自动处理重复，无需在 onAlarm 中额外操作
chrome.alarms.onAlarm.addListener((alarm) => {
  // 只需打开链接即可
  chrome.tabs.create({ url: link.url });

  // ❌ 不需要调用 updateLink 或 createAlarm
  // ❌ Chrome 会自动在 24 小时后再次触发
});
```

### 为什么之前的代码是错误的

```javascript
// ❌ 错误：重复任务无需手动更新时间
if (link.repeatDaily) {
  link.scheduledTime = nextTime;  // 不需要
  updateLink(link);                // 会创建新 alarm！
}
```

Chrome alarms 的 `periodInMinutes` 参数已经处理了重复逻辑：
- 首次触发后，Chrome 自动计算下次触发时间
- 不需要手动更新 `scheduledTime`
- 不需要重新创建 alarm

手动调用 `updateLink` 会导致：
1. 创建一个新的 alarm（ID 相同）
2. 旧的 alarm 被清除，新的 alarm 被创建
3. 但由于 `periodInMinutes` 参数，旧 alarm 可能还没完全清除就已经触发
4. 导致竞态条件，多个 alarm 共存

## 总结

**根本原因**：代码错误地认为需要在每次触发后手动更新重复任务，实际上 Chrome alarms API 已经自动处理了重复逻辑。

**解决方案**：移除重复任务触发后的 `updateLink` 调用，让 Chrome 自动处理重复。

**现在的行为**：
- 重复任务（`repeatDaily: true`）：Chrome 自动每24小时触发，无需手动干预
- 一次性任务（`repeatDaily: false`）：触发后自动删除链接和 alarm

请按照上面的步骤清理并重新导入配置，问题应该就会彻底解决！
