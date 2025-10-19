# 调试重复打开问题的步骤

## 问题描述
导入配置后，链接会重复打开很多次，每天也会重复打开很多次。

## 可能的原因

### 1. **导入前没有清空旧数据导致重复alarm**
如果你说"清空所有配置"，但实际上：
- Chrome storage 中可能还有旧数据
- Chrome alarms 中可能还有旧的定时任务

### 2. **多次导入同一个配置文件**
每次导入都会创建新的alarm，即使链接相同。

### 3. **重复任务的时间计算问题**
`repeatDaily` 任务可能在触发后没有正确更新时间。

## 诊断步骤

### 步骤1: 检查当前的 Chrome Storage 数据
打开扩展选项页面，按 F12 打开控制台，运行：

```javascript
chrome.storage.local.get('links', (result) => {
  const links = result.links || {};
  console.log('=== Chrome Storage 中的链接 ===');
  console.log('链接总数:', Object.keys(links).length);
  Object.entries(links).forEach(([id, link]) => {
    console.log(`\n链接 ${id}:`);
    console.log('  标题:', link.title);
    console.log('  URL:', link.url);
    console.log('  计划时间:', link.scheduledTime);
    console.log('  每天重复:', link.repeatDaily);
    console.log('  Alarm启用:', link.alarmEnabled);
  });
});
```

### 步骤2: 检查当前的 Chrome Alarms
继续在控制台运行：

```javascript
chrome.alarms.getAll((alarms) => {
  console.log('\n=== Chrome Alarms 列表 ===');
  console.log('Alarm总数:', alarms.length);
  alarms.forEach(alarm => {
    console.log(`\nAlarm ${alarm.name}:`);
    console.log('  触发时间:', alarm.scheduledTime ? new Date(alarm.scheduledTime).toLocaleString() : '无');
    console.log('  重复周期:', alarm.periodInMinutes ? `${alarm.periodInMinutes}分钟` : '一次性');
  });
});
```

### 步骤3: 对比链接和Alarms
运行这个脚本来找出不匹配的情况：

```javascript
chrome.storage.local.get('links', (result) => {
  const links = result.links || {};
  const linkIds = Object.keys(links);

  chrome.alarms.getAll((alarms) => {
    console.log('\n=== 对比分析 ===');
    console.log(`链接数量: ${linkIds.length}`);
    console.log(`Alarm数量: ${alarms.length}`);

    // 找出有链接但没有alarm的
    const linksWithoutAlarm = [];
    linkIds.forEach(id => {
      const hasAlarm = alarms.some(a => a.name === id);
      if (!hasAlarm && links[id].alarmEnabled !== false) {
        linksWithoutAlarm.push(id);
      }
    });

    // 找出有alarm但没有链接的（孤立alarm）
    const orphanAlarms = [];
    alarms.forEach(alarm => {
      if (!linkIds.includes(alarm.name)) {
        orphanAlarms.push(alarm.name);
      }
    });

    console.log(`\n有链接但缺少alarm: ${linksWithoutAlarm.length}`);
    if (linksWithoutAlarm.length > 0) {
      console.log('缺少alarm的链接:', linksWithoutAlarm);
    }

    console.log(`\n孤立的alarm（没有对应链接）: ${orphanAlarms.length}`);
    if (orphanAlarms.length > 0) {
      console.log('孤立alarm列表:', orphanAlarms);
    }

    // 检查是否有重复的URL
    const urlMap = {};
    Object.values(links).forEach(link => {
      if (!urlMap[link.url]) {
        urlMap[link.url] = [];
      }
      urlMap[link.url].push(link.id);
    });

    console.log('\n=== 重复URL检查 ===');
    Object.entries(urlMap).forEach(([url, ids]) => {
      if (ids.length > 1) {
        console.log(`⚠️  URL重复: ${url}`);
        console.log(`   链接IDs:`, ids);
        ids.forEach(id => {
          console.log(`   - ${id}: ${links[id].title} (alarm启用: ${links[id].alarmEnabled !== false})`);
        });
      }
    });
  });
});
```

## 解决方案

### 方案A: 完全清空并重新导入（推荐）

1. **导出当前配置做备份**（如果还没导出）

2. **完全清空所有数据**
   在控制台运行：
   ```javascript
   // 清空 storage
   chrome.storage.local.clear(() => {
     console.log('Storage已清空');
   });

   // 清空所有 alarms
   chrome.alarms.clearAll(() => {
     console.log('所有alarms已清空');
   });
   ```

3. **关闭扩展选项页，重新打开**

4. **导入配置文件**

5. **再次运行步骤1-3检查是否正常**

### 方案B: 使用"检查Alarms"按钮清理

1. 点击选项页的"检查Alarms"按钮
2. 查看统计信息
3. 如果有孤立alarm，点击"是"进行清理

## 预防措施

### 避免重复导入
- 导入前先导出当前配置做备份
- 确认配置文件中没有重复的链接
- 每次导入前使用"检查Alarms"确认状态

### 检查导入的配置文件
在导入前，用文本编辑器打开JSON文件，检查：
1. 是否有重复的URL
2. 每个链接是否都有唯一的标题
3. 时间格式是否正确

## 定位问题的关键信息

请运行上面的诊断脚本，并告诉我：
1. **链接总数** 和 **Alarm总数** 是否一致？
2. 是否有 **孤立的alarm**？
3. 是否有 **重复的URL**？
4. 如果有重复URL，它们的 **链接ID** 是什么样的？（是否都是类似的格式）

这些信息将帮助我准确定位问题所在。
