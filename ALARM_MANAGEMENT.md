# Alarm 管理说明文档

## 🎯 已实现的改进

### 1. 自动预防重复 Alarm

**位置**: `background.js:151-173`

在 `createAlarm()` 函数中添加了自动清理机制，每次创建 alarm 前都会先清除同名的旧 alarm：

```javascript
function createAlarm(id, scheduledTime, repeatDaily) {
  // 先清除可能存在的旧alarm，防止重复
  chrome.alarms.clear(id, (wasCleared) => {
    if (wasCleared) {
      console.log(`清除了旧的alarm: ${id}`);
    }
    // 然后创建新的alarm
    // ...
  });
}
```

**好处**:
- ✅ 自动预防重复，无需用户手动干预
- ✅ 在导入配置时不会创建重复的 alarm
- ✅ 在更新链接时确保只有一个 alarm
- ✅ 详细的控制台日志便于调试

---

### 2. 删除链接时的 Alarm 清理

**位置**: `background.js:141-154`

改进了 `deleteLink()` 函数，增加了清理反馈：

```javascript
async function deleteLink(id) {
  // 删除链接数据
  delete links[id];
  await chrome.storage.local.set({ links });

  // 清除对应的定时任务并记录日志
  chrome.alarms.clear(id, (wasCleared) => {
    if (wasCleared) {
      console.log(`删除链接时清除了alarm: ${id}`);
    } else {
      console.warn(`删除链接时未找到alarm: ${id}`);
    }
  });
}
```

**好处**:
- ✅ 删除链接时确保 alarm 也被删除
- ✅ 提供清理状态的日志反馈
- ✅ 防止孤立 alarm 的产生

---

### 3. 单独删除 Alarm 的功能

#### 3.1 后台消息处理器

**位置**: `background.js:97-107`

新增 `DELETE_ALARM` 消息类型，允许单独删除 alarm 而不删除链接数据：

```javascript
else if (message.type === "DELETE_ALARM") {
  chrome.alarms.clear(message.id, (wasCleared) => {
    if (wasCleared) {
      console.log(`手动删除alarm: ${message.id}`);
      sendResponse({ success: true });
    } else {
      console.warn(`alarm不存在: ${message.id}`);
      sendResponse({ success: false, error: 'Alarm不存在' });
    }
  });
  return true;
}
```

#### 3.2 选项页面按钮

**位置**: `options.js:239` 和 `options.js:282-297`

在每个链接项的操作按钮中添加了"删除Alarm"按钮：

```javascript
<button class="action-btn" data-action="delete-alarm" data-id="${link.id}">删除Alarm</button>
```

点击按钮时的处理逻辑：
```javascript
linkList.querySelectorAll('[data-action="delete-alarm"]').forEach(button => {
  button.addEventListener('click', () => {
    if (confirm('确定要删除这个链接对应的Alarm吗？\n\n注意：这只会删除定时任务，不会删除链接数据。')) {
      chrome.runtime.sendMessage({
        type: "DELETE_ALARM",
        id: button.dataset.id
      }, (response) => {
        if (response && response.success) {
          alert('Alarm已删除');
        } else {
          alert('删除失败: ' + (response ? response.error : '未知错误'));
        }
      });
    }
  });
});
```

**好处**:
- ✅ 可以单独删除 alarm 而保留链接数据
- ✅ 用于测试和调试场景
- ✅ 解决特定 alarm 问题时不影响数据
- ✅ 有明确的确认提示，防止误操作

---

## 📋 使用场景

### 场景 1: 日常使用（自动预防）

**无需操作**，系统会自动预防重复 alarm：

1. 添加新链接 → 自动创建 alarm
2. 编辑链接 → 自动清除旧 alarm，创建新 alarm
3. 导入配置 → 自动清除旧 alarm，创建新 alarm
4. 删除链接 → 自动清除对应 alarm

### 场景 2: 发现重复打开问题（批量清理）

使用选项页面的"检查 Alarms"按钮：

1. 点击"检查 Alarms"按钮
2. 查看检查结果（总数、孤立 alarm、其他扩展的 alarm）
3. 如果发现孤立 alarm，系统会询问是否清理
4. 确认后执行批量清理和重建

### 场景 3: 单个链接的 Alarm 出问题（单独删除）

使用新增的"删除 Alarm"按钮：

1. 在选项页面找到对应的链接
2. 点击"删除 Alarm"按钮
3. 确认删除操作
4. Alarm 被删除，但链接数据保留
5. 如需重新创建，可以编辑该链接并保存

### 场景 4: 调试和验证

#### 查看所有 alarms

在扩展的 Service Worker 控制台执行：

```javascript
chrome.alarms.getAll().then(alarms => {
  console.log(`当前alarm数量: ${alarms.length}`);
  alarms.forEach(alarm => {
    console.log(`- ${alarm.name} | 时间: ${new Date(alarm.scheduledTime).toLocaleString()} | 重复: ${alarm.periodInMinutes ? '是' : '否'}`);
  });
});
```

#### 查看所有链接

```javascript
chrome.storage.local.get('links').then(result => {
  const links = result.links || {};
  console.log(`当前链接数量: ${Object.keys(links).length}`);
  Object.values(links).forEach(link => {
    console.log(`- ${link.title} (ID: ${link.id})`);
  });
});
```

#### 手动清除特定 alarm

```javascript
chrome.alarms.clear('链接ID', (wasCleared) => {
  console.log('清除成功:', wasCleared);
});
```

---

## 🔍 验证修复效果

### 测试步骤 1: 验证自动预防重复

1. 创建一个测试链接，设置为 2 分钟后触发
2. 在 Service Worker 控制台查看 alarm 数量（应该为 1）
3. 编辑该链接，修改触发时间
4. 再次查看 alarm 数量（应该还是 1）
5. 查看控制台日志，应该看到"清除了旧的alarm"和"创建alarm成功"的消息

### 测试步骤 2: 验证删除 Alarm 功能

1. 在选项页面找到一个链接
2. 点击"删除 Alarm"按钮
3. 确认删除
4. 在 Service Worker 控制台查看 alarm 列表，该 alarm 应该已消失
5. 链接数据应该仍然存在

### 测试步骤 3: 验证导入不会重复

1. 导出当前配置
2. 导入刚导出的文件
3. 在 Service Worker 控制台查看 alarm 数量
4. Alarm 数量应该与链接数量一致（每个链接一个 alarm）
5. 控制台应该显示清除旧 alarm 的日志

---

## 🛠️ 技术细节

### Alarm 命名规则

- **本扩展**: 使用链接 ID（纯数字时间戳）作为 alarm 名称
- **格式**: `/^\d+$/`（例如：`1697123456789`）
- **映射**: 每个链接 ID 对应一个唯一的 alarm

### Chrome Alarms API 特性

- **持久化**: alarm 保存在浏览器中，重启后仍存在
- **命名唯一性**: 理论上同名 alarm 会被覆盖，但在异步场景下可能出现竞态条件
- **回调机制**: `chrome.alarms.clear()` 和 `chrome.alarms.create()` 都是异步的

### 为什么在 createAlarm 中先清除再创建

```javascript
chrome.alarms.clear(id, (wasCleared) => {
  // 在回调中创建新的 alarm
  chrome.alarms.create(id, {...});
});
```

- **避免竞态条件**: 确保清除操作完成后再创建
- **日志可见**: 可以记录是否真的清除了旧 alarm
- **防止累积**: 即使理论上同名会覆盖，显式清除更安全

---

## 📊 对比改进前后

### 改进前

| 操作 | 可能产生重复 Alarm | 需要手动清理 |
|------|-------------------|-------------|
| 添加链接 | ❌ | ❌ |
| 编辑链接 | ⚠️ 可能 | ✅ 是 |
| 导入配置 | ✅ 是 | ✅ 是 |
| 删除链接 | ❌ | ❌ |
| 扩展更新 | ✅ 是 | ✅ 是 |

### 改进后

| 操作 | 可能产生重复 Alarm | 需要手动清理 |
|------|-------------------|-------------|
| 添加链接 | ❌ | ❌ |
| 编辑链接 | ❌ | ❌ |
| 导入配置 | ❌ | ❌ |
| 删除链接 | ❌ | ❌ |
| 扩展更新 | ❌ | ❌ |

**额外能力**: 提供单独删除 alarm 的按钮用于调试和特殊场景

---

## 💡 常见问题

### Q: 为什么还保留"检查 Alarms"按钮？

A: 虽然新的自动预防机制能防止新问题，但可能仍存在历史遗留的孤立 alarm。"检查 Alarms"按钮可以批量清理这些历史问题。

### Q: "删除 Alarm"和"删除"按钮的区别？

A:
- **删除 Alarm**: 只删除定时任务，保留链接数据
- **删除**: 同时删除链接数据和定时任务

### Q: 什么时候需要使用"删除 Alarm"按钮？

A: 通常不需要。主要用于：
- 调试测试
- 暂时停止某个链接的定时触发，但保留数据
- 解决特定 alarm 的异常问题

### Q: 如何查看控制台日志？

A:
1. 打开 `chrome://extensions/`
2. 找到 Link Timer 扩展
3. 点击"Service worker"（或"检查视图"）
4. 在打开的控制台中查看日志

### Q: 日志会显示什么信息？

A:
- `清除了旧的alarm: [ID]` - 创建新 alarm 前清除了旧的
- `创建alarm成功: [ID], 触发时间: [时间], 重复: [true/false]` - 成功创建 alarm
- `删除链接时清除了alarm: [ID]` - 删除链接时清除了对应 alarm
- `手动删除alarm: [ID]` - 用户点击"删除 Alarm"按钮
- `发现孤立的alarm: [ID]，已清除` - 触发时发现没有对应链接的 alarm

---

## 🎉 总结

### 核心改进

1. ✅ **自动预防**: 在 `createAlarm` 中自动清除重复，无需用户干预
2. ✅ **增强清理**: 删除链接时确保 alarm 被清除
3. ✅ **单独操作**: 提供单独删除 alarm 的功能
4. ✅ **详细日志**: 所有操作都有控制台日志便于调试

### 使用建议

- **日常使用**: 无需关心，系统会自动处理
- **发现问题**: 使用"检查 Alarms"按钮批量清理
- **调试测试**: 使用"删除 Alarm"按钮进行精细控制
- **验证效果**: 查看 Service Worker 控制台的日志

### 防护级别

| 级别 | 机制 | 何时生效 |
|------|------|---------|
| **第一层** | createAlarm 自动清除 | 创建/更新时自动预防 |
| **第二层** | deleteLink 确保清除 | 删除链接时清理 |
| **第三层** | 孤立 alarm 检测 | alarm 触发时自动清理 |
| **第四层** | 批量清理功能 | 用户手动清理历史问题 |
| **第五层** | 单独删除按钮 | 精细控制特定 alarm |

现在这个扩展具有**多层防护机制**，可以有效防止和解决重复打开页面的问题！
