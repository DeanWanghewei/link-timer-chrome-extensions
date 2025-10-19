// 后台服务工作者
let capturedLinkData = null;

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addScheduledLink",
    title: "添加到定时链接管理器1.5",
    contexts: ["link"]
  });

  // 不再自动清理，由用户主动发起
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
  } else if (message.type === "CLEANUP_ALARMS") {
    cleanupAndRebuildAlarms().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("清理定时任务失败:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.type === "CHECK_ALARMS") {
    checkAlarms().then((result) => {
      sendResponse(result);
    }).catch((error) => {
      console.error("检查定时任务失败:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.type === "TOGGLE_ALARM") {
    toggleAlarm(message.id, message.enabled).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("切换alarm状态失败:", error);
      sendResponse({ success: false, error: error.message });
    });
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
    group: linkData.group || '默认分组', // 分组名称
    autoClose: linkData.autoClose || false, // 是否自动关闭
    autoCloseDelay: linkData.autoCloseDelay || 5, // 关闭延迟（秒）
    alarmEnabled: linkData.alarmEnabled !== undefined ? linkData.alarmEnabled : true, // alarm是否启用
    createdAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ links });

  // 只在启用时创建定时任务
  if (links[id].alarmEnabled) {
    await createAlarm(id, linkData.scheduledTime, linkData.repeatDaily);
  }
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
  chrome.alarms.clear(id, (wasCleared) => {
    if (wasCleared) {
      console.log(`删除链接时清除了alarm: ${id}`);
    } else {
      console.warn(`删除链接时未找到alarm: ${id}`);
    }
  });
}

// 切换alarm启用状态
async function toggleAlarm(id, enabled) {
  const links = await getLinks();
  const link = links[id];

  if (!link) {
    throw new Error('链接不存在');
  }

  // 更新启用状态
  link.alarmEnabled = enabled;
  links[id] = link;
  await chrome.storage.local.set({ links });

  if (enabled) {
    // 启用：创建alarm
    await createAlarm(id, link.scheduledTime, link.repeatDaily);
    console.log(`启用alarm: ${id}`);
  } else {
    // 禁用：删除alarm
    chrome.alarms.clear(id, (wasCleared) => {
      if (wasCleared) {
        console.log(`禁用alarm（已清除）: ${id}`);
      } else {
        console.log(`禁用alarm（无需清除）: ${id}`);
      }
    });
  }
}

// 更新链接
async function updateLink(linkData) {
  const links = await getLinks();
  // 保留 alarmEnabled 状态，如果未提供则默认为 true
  if (linkData.alarmEnabled === undefined && links[linkData.id]) {
    linkData.alarmEnabled = links[linkData.id].alarmEnabled !== undefined ? links[linkData.id].alarmEnabled : true;
  } else if (linkData.alarmEnabled === undefined) {
    linkData.alarmEnabled = true;
  }

  links[linkData.id] = linkData;
  await chrome.storage.local.set({ links });

  // 更新定时任务 - 不在这里清除，让 createAlarm 内部处理
  if (linkData.alarmEnabled) {
    await createAlarm(linkData.id, linkData.scheduledTime, linkData.repeatDaily);
  } else {
    // 如果禁用，则清除 alarm
    chrome.alarms.clear(linkData.id, (wasCleared) => {
      if (wasCleared) {
        console.log(`updateLink: 清除了alarm (已禁用): ${linkData.id}`);
      }
    });
  }
}

// 创建定时任务（返回Promise确保异步完成）
async function createAlarm(id, scheduledTime, repeatDaily) {
  // 先清除可能存在的旧alarm，防止重复
  const wasCleared = await new Promise((resolve) => {
    chrome.alarms.clear(id, resolve);
  });

  if (wasCleared) {
    console.log(`清除了旧的alarm: ${id}`);
  }

  const time = new Date(scheduledTime).getTime();

  // 创建新的 alarm
  await new Promise((resolve) => {
    if (repeatDaily) {
      // 每天重复，使用periodInMinutes参数
      chrome.alarms.create(id, {
        when: time,
        periodInMinutes: 24 * 60 // 24小时
      }, resolve);
    } else {
      // 一次性提醒
      chrome.alarms.create(id, {
        when: time
      }, resolve);
    }
  });

  console.log(`创建alarm成功: ${id}, 触发时间: ${new Date(time).toLocaleString()}, 重复: ${repeatDaily}`);
}

// 监听定时任务触发
chrome.alarms.onAlarm.addListener((alarm) => {
  // 获取对应的链接信息
  getLinks().then((links) => {
    const link = links[alarm.name];
    if (link) {
      // 打开链接
      chrome.tabs.create({ url: link.url }, (tab) => {
        // 如果启用了自动关闭功能
        if (link.autoClose) {
          const delay = (link.autoCloseDelay || 5) * 1000; // 转换为毫秒
          setTimeout(() => {
            chrome.tabs.remove(tab.id).catch((error) => {
              console.error("关闭标签页失败:", error);
            });
          }, delay);
        }
      });

      // 如果是每天重复的任务，更新下次执行时间
      if (link.repeatDaily) {
        const nextTime = new Date(link.scheduledTime);
        nextTime.setDate(nextTime.getDate() + 1);
        link.scheduledTime = nextTime.toISOString();
        updateLink(link);
      } else {
        // 非重复任务触发后自动删除
        deleteLink(alarm.name);
      }
    } else {
      // 如果找不到对应的链接，清除这个孤立的alarm
      console.warn(`发现孤立的alarm: ${alarm.name}，已清除`);
      chrome.alarms.clear(alarm.name);
    }
  }).catch((error) => {
    console.error("处理定时任务失败:", error);
  });
});

// 检查alarms状态（不执行清理，只返回信息）
async function checkAlarms() {
  try {
    // 获取所有现有的alarms (chrome.alarms.getAll() 只返回本扩展的 alarms)
    const allAlarms = await chrome.alarms.getAll();

    // 获取所有链接
    const links = await getLinks();
    const linkIds = Object.keys(links);

    // 分类alarms - 所有 alarm 都属于本扩展
    const validAlarms = [];
    const orphanAlarms = [];

    console.log('=== 开始检查 alarms ===');
    console.log(`总 alarms 数量: ${allAlarms.length}`);
    console.log(`链接 IDs:`, linkIds);

    for (const alarm of allAlarms) {
      console.log(`检查 alarm: ${alarm.name}`);

      if (linkIds.includes(alarm.name)) {
        validAlarms.push(alarm);
        console.log(`  -> 有效的 alarm`);
      } else {
        orphanAlarms.push(alarm);
        console.log(`  -> 孤立的 alarm（没有对应的链接）`);
      }
    }

    console.log(`检查完成 - 有效: ${validAlarms.length}, 孤立: ${orphanAlarms.length}`);

    return {
      success: true,
      total: allAlarms.length,
      validAlarms: validAlarms.map(a => ({
        name: a.name,
        scheduledTime: a.scheduledTime,
        periodInMinutes: a.periodInMinutes
      })),
      orphanAlarms: orphanAlarms.map(a => ({
        name: a.name,
        scheduledTime: a.scheduledTime,
        periodInMinutes: a.periodInMinutes
      })),
      linkCount: linkIds.length
    };
  } catch (error) {
    console.error('检查alarms失败:', error);
    throw error;
  }
}

// 清理并重建所有alarms
async function cleanupAndRebuildAlarms() {
  try {
    console.log('开始清理和重建定时任务...');

    // 获取所有现有的alarms (只包含本扩展的)
    const allAlarms = await chrome.alarms.getAll();
    console.log(`发现 ${allAlarms.length} 个现有定时任务`);

    // 获取所有链接
    const links = await getLinks();
    const linkIds = Object.keys(links);
    console.log(`发现 ${linkIds.length} 个链接`);

    // 清除所有 alarms
    let clearedCount = 0;
    let orphanCount = 0;

    for (const alarm of allAlarms) {
      await chrome.alarms.clear(alarm.name);
      clearedCount++;

      // 如果没有对应的链接，记录为孤立alarm
      if (!linkIds.includes(alarm.name)) {
        orphanCount++;
        console.log(`清除孤立alarm: ${alarm.name}`);
      }
    }

    console.log(`已清除 ${clearedCount} 个定时任务（其中 ${orphanCount} 个孤立任务）`);

    // 为每个有效链接重新创建alarm
    let recreatedCount = 0;
    for (const [id, link] of Object.entries(links)) {
      const scheduledTime = new Date(link.scheduledTime).getTime();
      const now = Date.now();

      // 只为未来的时间或重复任务创建alarm，且 alarm 必须启用
      if ((scheduledTime > now || link.repeatDaily) && link.alarmEnabled !== false) {
        await createAlarm(id, link.scheduledTime, link.repeatDaily);
        recreatedCount++;
      }
    }

    console.log(`重建完成，创建了 ${recreatedCount} 个定时任务`);
  } catch (error) {
    console.error('清理和重建定时任务失败:', error);
  }
}
