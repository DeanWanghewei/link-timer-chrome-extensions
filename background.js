// 后台服务工作者
let capturedLinkData = null;

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addScheduledLink",
    title: "添加到定时链接管理器",
    contexts: ["link"]
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addScheduledLink") {
    // 保存链接信息
    capturedLinkData = {
      url: info.linkUrl,
      title: tab.title
    };
    
    // 发送消息到所有内容脚本（如果有的话）
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "LINK_CAPTURED",
          data: capturedLinkData
        }, () => {
          // 忽略错误，因为内容脚本可能不存在
          if (chrome.runtime.lastError) {
            // 不需要处理错误
          }
        });
      }
    });
    
    // 打开弹出窗口
    chrome.action.openPopup();
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_LINK") {
    saveLink(message.data).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("保存链接失败:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放以进行异步响应
  } else if (message.type === "GET_LINKS") {
    getLinks().then((links) => {
      sendResponse({ links });
    }).catch((error) => {
      console.error("获取链接失败:", error);
      sendResponse({ links: {} });
    });
    return true;
  } else if (message.type === "DELETE_LINK") {
    deleteLink(message.id).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("删除链接失败:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.type === "UPDATE_LINK") {
    updateLink(message.data).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("更新链接失败:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.type === "GET_CAPTURED_LINK") {
    sendResponse({ data: capturedLinkData });
    return true;
  }
  // 对于未处理的消息，不返回true以避免错误
});

// 保存链接到存储
async function saveLink(linkData) {
  const links = await getLinks();
  const id = Date.now().toString();
  links[id] = {
    id,
    url: linkData.url,
    title: linkData.title,
    scheduledTime: linkData.scheduledTime,
    repeatDaily: linkData.repeatDaily || false, // 是否每天重复
    createdAt: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ links });
  
  // 创建定时任务
  createAlarm(id, linkData.scheduledTime, linkData.repeatDaily);
}

// 获取所有链接
async function getLinks() {
  const result = await chrome.storage.local.get("links");
  return result.links || {};
}

// 删除链接
async function deleteLink(id) {
  const links = await getLinks();
  delete links[id];
  await chrome.storage.local.set({ links });
  
  // 清除对应的定时任务
  chrome.alarms.clear(id);
}

// 更新链接
async function updateLink(linkData) {
  const links = await getLinks();
  links[linkData.id] = linkData;
  await chrome.storage.local.set({ links });
  
  // 更新定时任务
  chrome.alarms.clear(linkData.id);
  createAlarm(linkData.id, linkData.scheduledTime, linkData.repeatDaily);
}

// 创建定时任务
function createAlarm(id, scheduledTime, repeatDaily) {
  const time = new Date(scheduledTime).getTime();
  if (repeatDaily) {
    // 每天重复，使用periodInMinutes参数
    chrome.alarms.create(id, {
      when: time,
      periodInMinutes: 24 * 60 // 24小时
    });
  } else {
    // 一次性提醒
    chrome.alarms.create(id, {
      when: time
    });
  }
}

// 监听定时任务触发
chrome.alarms.onAlarm.addListener((alarm) => {
  // 获取对应的链接信息
  getLinks().then((links) => {
    const link = links[alarm.name];
    if (link) {
      // 直接打开链接
      chrome.tabs.create({ url: link.url });
      
      // 如果是每天重复的任务，更新下次执行时间
      if (link.repeatDaily) {
        const nextTime = new Date(link.scheduledTime);
        nextTime.setDate(nextTime.getDate() + 1);
        link.scheduledTime = nextTime.toISOString();
        updateLink(link);
      }
    }
  }).catch((error) => {
    console.error("处理定时任务失败:", error);
  });
});
