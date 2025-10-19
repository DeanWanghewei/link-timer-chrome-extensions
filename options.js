// options.js - 选项页面逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const linkForm = document.getElementById('linkForm');
  const linkIdInput = document.getElementById('linkId');
  const linkTitleInput = document.getElementById('linkTitle');
  const linkUrlInput = document.getElementById('linkUrl');
  const scheduledTimeInput = document.getElementById('scheduledTime');
  const linkGroupInput = document.getElementById('linkGroup');
  const repeatDailyInput = document.getElementById('repeatDaily');
  const linkNotesInput = document.getElementById('linkNotes');
  const autoCloseInput = document.getElementById('autoClose');
  const autoCloseDelayInput = document.getElementById('autoCloseDelay');
  const autoCloseDelayGroup = document.getElementById('autoCloseDelayGroup');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const linkList = document.getElementById('linkList');
  const searchInput = document.getElementById('searchInput');
  const addLinkBtn = document.getElementById('addLinkBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const exportBtn = document.getElementById('exportBtn');
  const cleanupBtn = document.getElementById('cleanupBtn'); // 可能为null，如果按钮被注释
  const linkModal = document.getElementById('linkModal');
  const modalTitle = document.getElementById('modalTitle');
  const closeBtn = document.querySelector('.close');

  // 自动关闭复选框事件
  autoCloseInput.addEventListener('change', () => {
    autoCloseDelayGroup.style.display = autoCloseInput.checked ? 'block' : 'none';
  });

  // 添加链接按钮事件
  addLinkBtn.addEventListener('click', () => {
    // 重置表单
    resetForm();
    // 设置弹窗标题
    modalTitle.textContent = '添加链接';
    // 显示弹窗
    linkModal.style.display = 'block';
  });

  // 关闭弹窗按钮事件
  closeBtn.addEventListener('click', () => {
    linkModal.style.display = 'none';
  });

  // 取消按钮事件
  cancelBtn.addEventListener('click', () => {
    linkModal.style.display = 'none';
  });

  // 点击弹窗外部关闭弹窗
  window.addEventListener('click', (event) => {
    if (event.target === linkModal) {
      linkModal.style.display = 'none';
    }
  });

  // 表单提交事件
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // 将时间转换为完整的日期时间字符串
    const today = new Date();
    const [hours, minutes] = scheduledTimeInput.value.split(':');
    const scheduledDateTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes
    );

    const linkData = {
      id: linkIdInput.value || Date.now().toString(),
      url: linkUrlInput.value,
      title: linkTitleInput.value,
      scheduledTime: scheduledDateTime.toISOString(),
      group: linkGroupInput.value.trim() || '默认分组',
      repeatDaily: repeatDailyInput.checked,
      notes: linkNotesInput.value,
      autoClose: autoCloseInput.checked,
      autoCloseDelay: autoCloseInput.checked ? parseInt(autoCloseDelayInput.value) || 5 : 5,
      createdAt: new Date().toISOString()
    };

    if (!linkData.url || !linkData.title || !scheduledTimeInput.value) {
      alert('请填写必填字段');
      return;
    }

    // 发送消息到background保存或更新链接
    const messageType = linkIdInput.value ? "UPDATE_LINK" : "SAVE_LINK";
    chrome.runtime.sendMessage({
      type: messageType,
      data: linkData
    }, (response) => {
      if (response && response.success) {
        // 关闭弹窗并重置表单
        linkModal.style.display = 'none';
        resetForm();
        loadLinks();
      } else {
        alert('保存失败: ' + (response ? response.error : '未知错误'));
      }
    });
  });

  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    loadLinks(e.target.value);
  });

  // 导入按钮事件
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  // 文件选择事件
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importLinks(file);
      // 清空文件选择，允许重复导入同一个文件
      importFile.value = '';
    }
  });

  // 导出按钮事件
  exportBtn.addEventListener('click', () => {
    exportLinks();
  });

  // 清理按钮事件（只在按钮存在时添加）
  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', () => {
      cleanupAlarms();
    });
  }

  // 加载链接列表
  loadLinks();
});

// 加载链接列表
function loadLinks(searchTerm = '') {
  chrome.runtime.sendMessage({
    type: "GET_LINKS"
  }, (response) => {
    if (response) {
      displayLinks(response.links, searchTerm);
      updateGroupSuggestions(response.links);
    }
  });
}

// 更新分组建议列表
function updateGroupSuggestions(links) {
  const groups = new Set();
  Object.values(links || {}).forEach(link => {
    if (link.group) {
      groups.add(link.group);
    }
  });
  const datalist = document.getElementById('groupSuggestions');
  datalist.innerHTML = '';
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    datalist.appendChild(option);
  });
}

// 显示链接列表
function displayLinks(links, searchTerm = '') {
  const linkList = document.getElementById('linkList');

  // 转换为数组
  let linksArray = Object.values(links || {});

  // 如果有搜索词，过滤链接
  if (searchTerm) {
    linksArray = linksArray.filter(link =>
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.notes && link.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.group && link.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  if (linksArray.length === 0) {
    linkList.innerHTML = '<div class="empty-state">暂无链接数据</div>';
    return;
  }

  // 按分组组织链接
  const groupedLinks = {};
  linksArray.forEach(link => {
    const group = link.group || '默认分组';
    if (!groupedLinks[group]) {
      groupedLinks[group] = [];
    }
    groupedLinks[group].push(link);
  });

  // 对每个分组内的链接按计划时间升序排序
  Object.keys(groupedLinks).forEach(group => {
    groupedLinks[group].sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  });

  // 按分组名称排序
  const sortedGroups = Object.keys(groupedLinks).sort();

  // 生成HTML
  let html = '';
  sortedGroups.forEach(group => {
    html += `
      <div class="group-section">
        <h3 class="group-title">${escapeHtml(group)} (${groupedLinks[group].length})</h3>
        <ul class="link-list">
    `;

    groupedLinks[group].forEach(link => {
      html += `
        <li class="link-item">
          <div class="link-title">${escapeHtml(link.title)}</div>
          <div class="link-url">${escapeHtml(link.url)}</div>
          <div class="link-meta">
            <span>计划时间: ${formatDate(new Date(link.scheduledTime))}${link.repeatDaily ? ' (每天)' : ''}</span>
            <span>创建时间: ${formatDate(new Date(link.createdAt))}</span>
          </div>
          ${link.autoClose ? `<div class="link-meta"><span>自动关闭: ${link.autoCloseDelay || 5}秒后关闭</span></div>` : ''}
          ${link.notes ? `<div class="link-notes">${escapeHtml(link.notes)}</div>` : ''}
          <div class="link-actions">
            <button class="action-btn" data-action="edit" data-id="${link.id}">编辑</button>
            <button class="action-btn" data-action="open" data-url="${escapeHtml(link.url)}">打开</button>
            <label class="alarm-switch-label">
              <span>Alarm</span>
              <input type="checkbox" class="alarm-switch" data-action="toggle-alarm" data-id="${link.id}" ${link.alarmEnabled !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <button class="action-btn btn-danger" data-action="delete" data-id="${link.id}">删除</button>
          </div>
        </li>
      `;
    });

    html += `
        </ul>
      </div>
    `;
  });

  linkList.innerHTML = html;

  // 绑定事件
  linkList.querySelectorAll('[data-action="edit"]').forEach(button => {
    button.addEventListener('click', () => {
      openEditModal(button.dataset.id, links);
    });
  });

  linkList.querySelectorAll('[data-action="open"]').forEach(button => {
    button.addEventListener('click', () => {
      chrome.tabs.create({ url: button.dataset.url });
    });
  });

  linkList.querySelectorAll('[data-action="delete"]').forEach(button => {
    button.addEventListener('click', () => {
      if (confirm('确定要删除这个链接吗？')) {
        chrome.runtime.sendMessage({
          type: "DELETE_LINK",
          id: button.dataset.id
        }, (response) => {
          if (response && response.success) {
            loadLinks();
          }
        });
      }
    });
  });

  linkList.querySelectorAll('[data-action="toggle-alarm"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const enabled = checkbox.checked;
      chrome.runtime.sendMessage({
        type: "TOGGLE_ALARM",
        id: checkbox.dataset.id,
        enabled: enabled
      }, (response) => {
        if (response && response.success) {
          console.log(`Alarm已${enabled ? '启用' : '禁用'}`);
        } else {
          alert('切换失败: ' + (response ? response.error : '未知错误'));
          // 恢复开关状态
          checkbox.checked = !enabled;
        }
      });
    });
  });
}

// 打开编辑弹窗
function openEditModal(id, links) {
  const link = links[id];
  if (!link) return;

  // 填充表单数据
  document.getElementById('linkId').value = link.id;
  document.getElementById('linkTitle').value = link.title;
  document.getElementById('linkUrl').value = link.url;

  // 解析时间
  const scheduledDate = new Date(link.scheduledTime);
  const timeString = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;
  document.getElementById('scheduledTime').value = timeString;

  document.getElementById('linkGroup').value = link.group || '默认分组';
  document.getElementById('repeatDaily').checked = link.repeatDaily || false;
  document.getElementById('linkNotes').value = link.notes || '';
  document.getElementById('autoClose').checked = link.autoClose || false;
  document.getElementById('autoCloseDelay').value = link.autoCloseDelay || 5;

  // 显示或隐藏延迟输入框
  document.getElementById('autoCloseDelayGroup').style.display = (link.autoClose ? 'block' : 'none');

  // 设置弹窗标题
  document.getElementById('modalTitle').textContent = '编辑链接';

  // 显示弹窗
  document.getElementById('linkModal').style.display = 'block';
}

// 重置表单
function resetForm() {
  document.getElementById('linkForm').reset();
  document.getElementById('linkId').value = '';

  // 设置默认时间（当前时间加2分钟）
  const now = new Date();
  now.setMinutes(now.getMinutes() + 2);
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  document.getElementById('scheduledTime').value = timeString;

  document.getElementById('repeatDaily').checked = true;
  document.getElementById('autoClose').checked = false;
  document.getElementById('autoCloseDelay').value = 5;
  document.getElementById('autoCloseDelayGroup').style.display = 'none';
}

// 格式化日期用于显示
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 转义HTML特殊字符
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, m => map[m]);
}

// 导入链接从JSON文件
function importLinks(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);

      // 验证数据格式
      if (!Array.isArray(importedData)) {
        alert('导入失败：文件格式不正确，应该是一个数组');
        return;
      }

      // 询问用户是否确认导入
      const confirmed = confirm(
        `检测到 ${importedData.length} 条配置记录。\n\n` +
        '确定导入这些配置吗？\n' +
        '（所有导入的配置将作为新配置添加）'
      );

      if (!confirmed) {
        return;
      }

      chrome.runtime.sendMessage({
        type: "GET_LINKS"
      }, (response) => {
        let links = response && response.links ? response.links : {};

        // 导入数据
        let importCount = 0;
        let skipCount = 0;
        const now = new Date().toISOString();
        const newLinks = [];  // 记录新导入的链接

        importedData.forEach((link, index) => {
          // 验证必需字段
          if (!link.url || !link.title || !link.scheduledTime) {
            skipCount++;
            return;
          }

          // 生成新ID - 使用时间戳 + 索引 + 随机数，避免冲突
          const id = Date.now().toString() + '_' + index + '_' + Math.random().toString(36).substr(2, 9);

          const newLink = {
            id: id,
            url: link.url,
            title: link.title,
            scheduledTime: link.scheduledTime,
            group: link.group || '默认分组',
            repeatDaily: link.repeatDaily || false,
            notes: link.notes || '',
            autoClose: link.autoClose || false,
            autoCloseDelay: link.autoCloseDelay || 5,
            alarmEnabled: true,  // 默认启用
            createdAt: now  // 使用导入时间作为创建时间
          };

          links[id] = newLink;
          newLinks.push(newLink);  // 添加到新链接列表
          importCount++;
        });

        // 保存到storage
        chrome.storage.local.set({ links }, () => {
          // ✅ 只为新导入的链接创建 alarm
          let createdCount = 0;
          newLinks.forEach(link => {
            chrome.runtime.sendMessage({
              type: "UPDATE_LINK",
              data: link
            }, (response) => {
              createdCount++;
              if (createdCount === newLinks.length) {
                console.log(`导入完成：为 ${newLinks.length} 个链接创建了 alarm`);
              }
            });
          });

          // 刷新列表
          loadLinks();

          // 显示导入结果
          let message = `导入成功！\n新增: ${importCount} 条配置`;
          if (skipCount > 0) {
            message += `\n跳过: ${skipCount} 条（数据不完整）`;
          }
          alert(message);
        });
      });

    } catch (error) {
      alert('导入失败：文件格式错误或文件损坏\n' + error.message);
    }
  };

  reader.onerror = () => {
    alert('导入失败：无法读取文件');
  };

  reader.readAsText(file);
}

// 导出链接到JSON文件
function exportLinks() {
  chrome.runtime.sendMessage({
    type: "GET_LINKS"
  }, (response) => {
    if (response && response.links) {
      const linksArray = Object.values(response.links);

      if (linksArray.length === 0) {
        alert('暂无数据可以导出');
        return;
      }

      // 转换为JSON字符串
      const jsonData = JSON.stringify(linksArray, null, 2);

      // 创建Blob对象
      const blob = new Blob([jsonData], { type: 'application/json' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 生成文件名，包含当前日期时间
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      a.download = `link-timer-export-${dateStr}.json`;

      // 触发下载
      document.body.appendChild(a);
      a.click();

      // 清理
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } else {
      alert('导出失败，请重试');
    }
  });
}

// 清理历史配置（清除孤立的alarms）
function cleanupAlarms() {
  // 第一步：检查当前的alarms状态
  chrome.runtime.sendMessage({
    type: "CHECK_ALARMS"
  }, (checkResult) => {
    if (!checkResult || !checkResult.success) {
      alert('检查失败: ' + (checkResult ? checkResult.error : '未知错误'));
      return;
    }

    // 计算有效的alarm数量
    const validAlarms = checkResult.validAlarms || [];
    const orphanAlarms = checkResult.orphanAlarms || [];

    // 构建详细信息
    let message = '=== Alarm 检查结果 ===\n\n';
    message += `总Alarm数量: ${checkResult.total}\n`;
    message += `├─ 有效的Alarm: ${validAlarms.length}\n`;
    message += `└─ 孤立的Alarm: ${orphanAlarms.length}\n`;
    message += `\n当前链接数量: ${checkResult.linkCount}\n\n`;

    // 注意：chrome.alarms.getAll() 只返回本扩展的 alarms
    message += `💡 提示: Chrome alarms 是按扩展隔离的\n`;
    message += `   这里显示的所有 alarm 都属于本扩展\n\n`;

    // 显示孤立的alarms（不在管理列表中的）
    if (orphanAlarms.length > 0) {
      message += '--- 孤立的Alarm（不在管理列表中）---\n';
      orphanAlarms.forEach(alarm => {
        const time = alarm.scheduledTime ? new Date(alarm.scheduledTime).toLocaleString() : '无';
        const period = alarm.periodInMinutes ? `每${alarm.periodInMinutes}分钟` : '一次性';
        message += `• ID: ${alarm.name} (${time}, ${period})\n`;
      });
      message += '\n';
    } else {
      message += '✅ 没有发现孤立的Alarm\n\n';
    }

    // 显示检查结果
    alert(message);

    // 如果有孤立的alarms，询问是否清理
    if (orphanAlarms.length > 0) {
      const confirmCleanup = confirm(
        `发现 ${orphanAlarms.length} 个孤立的Alarm（不在管理列表中）。\n\n` +
        '这些孤立的Alarm可能会导致重复打开链接。\n\n' +
        '⚠️  即将执行的操作：\n' +
        `1. 清除所有 ${checkResult.total} 个 Alarm\n` +
        `2. 为 ${checkResult.linkCount} 个链接重新创建Alarm\n\n` +
        '是否继续清理？'
      );

      if (confirmCleanup) {
        // 执行清理
        chrome.runtime.sendMessage({
          type: "CLEANUP_ALARMS"
        }, (response) => {
          if (response && response.success) {
            alert(
              '✅ 清理成功！\n\n' +
              `已清除 ${orphanAlarms.length} 个孤立的Alarm\n` +
              `已为 ${checkResult.linkCount} 个链接重新创建Alarm\n\n` +
              '您可以打开浏览器控制台查看详细的清理日志。'
            );
            loadLinks();
          } else {
            alert('清理失败: ' + (response ? response.error : '未知错误'));
          }
        });
      }
    }
  });
}
