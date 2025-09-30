// popup.js - 弹出窗口逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const linkTitleInput = document.getElementById('linkTitle');
  const linkUrlInput = document.getElementById('linkUrl');
  const scheduledTimeInput = document.getElementById('scheduledTime');
  const linkGroupInput = document.getElementById('linkGroup');
  const repeatDailyInput = document.getElementById('repeatDaily');
  const autoCloseInput = document.getElementById('autoClose');
  const autoCloseDelayInput = document.getElementById('autoCloseDelay');
  const autoCloseDelayGroup = document.getElementById('autoCloseDelayGroup');
  const saveBtn = document.getElementById('saveBtn');
  const manageLinksBtn = document.getElementById('manageLinksBtn');
  
  // 设置默认时间（当前时间加2分钟）
  const now = new Date();
  now.setMinutes(now.getMinutes() + 2);
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  scheduledTimeInput.value = timeString;

  // 自动关闭复选框事件
  autoCloseInput.addEventListener('change', () => {
    autoCloseDelayGroup.style.display = autoCloseInput.checked ? 'block' : 'none';
  });

  // 页面加载时检查是否有链接数据传递过来
  chrome.runtime.sendMessage({
    type: "GET_CAPTURED_LINK"
  }, (response) => {
    if (response && response.data) {
      linkUrlInput.value = response.data.url;
      linkTitleInput.value = response.data.title;
    }
  });

  // 加载已有的分组列表用于自动补全
  chrome.runtime.sendMessage({
    type: "GET_LINKS"
  }, (response) => {
    if (response && response.links) {
      const groups = new Set();
      Object.values(response.links).forEach(link => {
        if (link.group) {
          groups.add(link.group);
        }
      });
      const datalist = document.getElementById('groupSuggestions');
      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        datalist.appendChild(option);
      });
    }
  });
  
  // 保存按钮点击事件
  saveBtn.addEventListener('click', () => {
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
      url: linkUrlInput.value,
      title: linkTitleInput.value,
      scheduledTime: scheduledDateTime.toISOString(),
      group: linkGroupInput.value.trim() || '默认分组',
      repeatDaily: repeatDailyInput.checked,
      autoClose: autoCloseInput.checked,
      autoCloseDelay: autoCloseInput.checked ? parseInt(autoCloseDelayInput.value) || 5 : 5
    };
    
    if (!linkData.url || !linkData.title || !scheduledTimeInput.value) {
      alert('请填写所有字段');
      return;
    }
    
    // 发送消息到background保存链接
    chrome.runtime.sendMessage({
      type: "SAVE_LINK",
      data: linkData
    }, (response) => {
      if (response && response.success) {
        // 清空表单
        linkUrlInput.value = '';
        linkTitleInput.value = '';
        linkGroupInput.value = '';
        repeatDailyInput.checked = true;
        autoCloseInput.checked = false;
        autoCloseDelayInput.value = 5;
        autoCloseDelayGroup.style.display = 'none';

        // 重新设置默认时间（当前时间加2分钟）
        const newTime = new Date();
        newTime.setMinutes(newTime.getMinutes() + 2);
        const newTimeString = `${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`;
        scheduledTimeInput.value = newTimeString;
      } else {
        alert('保存失败: ' + (response ? response.error : '未知错误'));
      }
    });
  });
  
  // 管理链接按钮点击事件
  manageLinksBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});