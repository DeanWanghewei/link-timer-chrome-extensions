# 备份和恢复扩展数据

## 备份当前配置

### 方法1: 使用Chrome开发者工具备份
1. 打开Chrome,进入 `chrome://extensions/`
2. 开启"开发者模式"
3. 找到Link Timer扩展,点击"背景页"或"service worker"
4. 在控制台输入:
```javascript
chrome.storage.local.get('links', (result) => {
  console.log(JSON.stringify(result.links, null, 2));
  // 复制输出的JSON保存到文件
});
```

### 方法2: 使用导出功能
直接在扩展管理页面点击"导出配置"按钮

## 恢复配置

### 使用Chrome开发者工具恢复
1. 打开扩展的"背景页"或"service worker"控制台
2. 粘贴以下代码(替换`YOUR_BACKUP_DATA`为你的备份数据):
```javascript
const backupData = YOUR_BACKUP_DATA; // 这里粘贴你的备份JSON
chrome.storage.local.set({ links: backupData }, () => {
  console.log('配置已恢复');
  // 重新加载所有alarm
  Object.values(backupData).forEach(link => {
    chrome.alarms.create(link.id, {
      when: new Date(link.scheduledTime).getTime(),
      periodInMinutes: link.repeatDaily ? 24 * 60 : undefined
    });
  });
});
```

## 测试建议

1. **先导出备份**: 在任何修改前先导出一份配置
2. **使用独立配置文件测试**: 避免影响日常使用
3. **分步测试**: 先测试分组功能,再测试导出功能