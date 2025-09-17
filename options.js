// options.js - 选项页面逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const linkForm = document.getElementById('linkForm');
  const linkIdInput = document.getElementById('linkId');
  const linkTitleInput = document.getElementById('linkTitle');
  const linkUrlInput = document.getElementById('linkUrl');
  const scheduledTimeInput = document.getElementById('scheduledTime');
  const repeatDailyInput = document.getElementById('repeatDaily');
  const linkNotesInput = document.getElementById('linkNotes');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const linkList = document.getElementById('linkList');
  const searchInput = document.getElementById('searchInput');
  const addLinkBtn = document.getElementById('addLinkBtn');
  const linkModal = document.getElementById('linkModal');
  const modalTitle = document.getElementById('modalTitle');
  const closeBtn = document.querySelector('.close');
  
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
      repeatDaily: repeatDailyInput.checked,
      notes: linkNotesInput.value,
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
    }
  });
}

// 显示链接列表
function displayLinks(links, searchTerm = '') {
  const linkList = document.getElementById('linkList');
  
  // 转换为数组并按时间排序
  let linksArray = Object.values(links || {});
  linksArray.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  
  // 如果有搜索词，过滤链接
  if (searchTerm) {
    linksArray = linksArray.filter(link => 
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.notes && link.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  
  if (linksArray.length === 0) {
    linkList.innerHTML = '<div class="empty-state">暂无链接数据</div>';
    return;
  }
  
  linkList.innerHTML = linksArray.map(link => `
    <li class="link-item">
      <div class="link-title">${escapeHtml(link.title)}</div>
      <div class="link-url">${escapeHtml(link.url)}</div>
      <div class="link-meta">
        <span>计划时间: ${formatDate(new Date(link.scheduledTime))}${link.repeatDaily ? ' (每天)' : ''}</span>
        <span>创建时间: ${formatDate(new Date(link.createdAt))}</span>
      </div>
      ${link.notes ? `<div class="link-notes">${escapeHtml(link.notes)}</div>` : ''}
      <div class="link-actions">
        <button class="action-btn" data-action="edit" data-id="${link.id}">编辑</button>
        <button class="action-btn" data-action="open" data-url="${escapeHtml(link.url)}">打开</button>
        <button class="action-btn btn-danger" data-action="delete" data-id="${link.id}">删除</button>
      </div>
    </li>
  `).join('');
  
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
  
  document.getElementById('repeatDaily').checked = link.repeatDaily || false;
  document.getElementById('linkNotes').value = link.notes || '';
  
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