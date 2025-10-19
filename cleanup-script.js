/**
 * Alarm检查和清理脚本
 *
 * 使用方法：
 * 1. 打开 chrome://extensions/
 * 2. 找到 Link Timer 扩展，点击"service worker"或"背景页"
 * 3. 复制下面的代码粘贴到控制台执行
 *
 * 功能：
 * - 检查所有alarm的状态
 * - 识别孤立的alarm（不在管理列表中的）
 * - 显示其他扩展的alarm（不会被清理）
 * - 让用户确认后再执行清理
 */

(async function cleanupExtensionData() {
  console.log('=== 开始检查Alarm状态 ===');

  try {
    // 1. 获取所有现有的alarms
    console.log('\n步骤 1: 检查现有的定时任务...');
    const allAlarms = await chrome.alarms.getAll();
    console.log(`发现 ${allAlarms.length} 个定时任务:`, allAlarms.map(a => a.name));

    // 2. 获取所有保存的链接
    console.log('\n步骤 2: 检查保存的链接...');
    const result = await chrome.storage.local.get('links');
    const links = result.links || {};
    const linkIds = Object.keys(links);
    console.log(`发现 ${linkIds.length} 个保存的链接`);

    // 3. 找出属于本扩展的alarms
    console.log('\n步骤 3: 识别本扩展的定时任务...');
    // 本扩展的alarm名称格式为：纯数字的timestamp字符串
    const ourAlarms = allAlarms.filter(alarm => /^\d+$/.test(alarm.name));
    const otherAlarms = allAlarms.filter(alarm => !/^\d+$/.test(alarm.name));
    console.log(`本扩展的任务: ${ourAlarms.length} 个`);
    console.log(`其他扩展的任务: ${otherAlarms.length} 个`);

    if (otherAlarms.length > 0) {
      console.log('⚠️  其他扩展的Alarm列表（不会被清除）:');
      otherAlarms.forEach(alarm => {
        const time = alarm.scheduledTime ? new Date(alarm.scheduledTime).toLocaleString() : '无';
        const period = alarm.periodInMinutes ? `每${alarm.periodInMinutes}分钟` : '一次性';
        console.log(`  • ${alarm.name} (${time}, ${period})`);
      });
    }

    // 4. 找出孤立的alarms（没有对应链接的alarm）
    console.log('\n步骤 4: 查找孤立的定时任务...');
    const orphanAlarms = ourAlarms.filter(alarm => !linkIds.includes(alarm.name));
    console.log(`发现 ${orphanAlarms.length} 个孤立的定时任务`);

    if (orphanAlarms.length > 0) {
      console.log('孤立的Alarm列表:');
      orphanAlarms.forEach(alarm => {
        const time = alarm.scheduledTime ? new Date(alarm.scheduledTime).toLocaleString() : '无';
        const period = alarm.periodInMinutes ? `每${alarm.periodInMinutes}分钟` : '一次性';
        console.log(`  • ID: ${alarm.name} (${time}, ${period})`);
      });
    }

    // 5. 询问用户是否继续
    console.log('\n步骤 5: 等待用户确认...');

    if (orphanAlarms.length === 0) {
      console.log('✅ 没有发现孤立的Alarm，无需清理');
      console.log('\n=== 检查完成 ===');
      return;
    }

    const userConfirmed = confirm(
      `发现 ${orphanAlarms.length} 个孤立的Alarm（不在管理列表中）\n\n` +
      '即将执行的操作：\n' +
      `1. 清除 ${ourAlarms.length} 个本扩展的Alarm\n` +
      `2. 保留 ${otherAlarms.length} 个其他扩展的Alarm（不会删除）\n` +
      `3. 为 ${linkIds.length} 个链接重新创建Alarm\n\n` +
      '是否继续清理？'
    );

    if (!userConfirmed) {
      console.log('❌ 用户取消了清理操作');
      console.log('\n=== 操作已取消 ===');
      return;
    }

    // 6. 只清除属于本扩展的alarms
    console.log('\n步骤 6: 清除本扩展的定时任务...');
    for (const alarm of ourAlarms) {
      await chrome.alarms.clear(alarm.name);
      console.log(`  已清除: ${alarm.name}`);
    }

    // 7. 为有效的链接重新创建alarms
    console.log('\n步骤 7: 为有效链接重新创建定时任务...');
    let recreatedCount = 0;
    for (const [id, link] of Object.entries(links)) {
      const scheduledTime = new Date(link.scheduledTime).getTime();
      const now = Date.now();

      // 只为未来的时间创建alarm
      if (scheduledTime > now || link.repeatDaily) {
        const alarmInfo = {
          when: scheduledTime
        };

        if (link.repeatDaily) {
          // 如果是每天重复，且时间已过，计算下一次触发时间
          if (scheduledTime < now) {
            const nextTime = new Date(scheduledTime);
            while (nextTime.getTime() < now) {
              nextTime.setDate(nextTime.getDate() + 1);
            }
            alarmInfo.when = nextTime.getTime();
          }
          alarmInfo.periodInMinutes = 24 * 60;
        }

        await chrome.alarms.create(id, alarmInfo);
        recreatedCount++;
        console.log(`  已创建: ${link.title} (${id})`);
      } else {
        console.log(`  跳过过期链接: ${link.title} (${id})`);
      }
    }

    // 8. 验证结果
    console.log('\n步骤 8: 验证清理结果...');
    const finalAlarms = await chrome.alarms.getAll();
    console.log(`当前定时任务数: ${finalAlarms.length}`);
    console.log(`重新创建的任务数: ${recreatedCount}`);

    // 9. 显示汇总
    console.log('\n=== 清理成功完成 ===');
    console.log(`清理前总任务数: ${allAlarms.length} 个`);
    console.log(`  - 本扩展: ${ourAlarms.length} 个`);
    console.log(`  - 其他扩展: ${otherAlarms.length} 个（未清除）`);
    console.log(`清理后总任务数: ${finalAlarms.length} 个`);
    console.log(`删除的孤立任务: ${orphanAlarms.length} 个`);
    console.log(`重新创建的任务: ${recreatedCount} 个`);

    if (orphanAlarms.length > 0) {
      console.log('\n孤立任务详情:');
      orphanAlarms.forEach(alarm => {
        console.log(`  - ${alarm.name} (下次触发: ${new Date(alarm.scheduledTime || 0).toLocaleString()})`);
      });
    }

    console.log('\n✅ 清理成功完成！');

  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
    console.error(error.stack);
  }
})();
