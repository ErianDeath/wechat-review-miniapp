const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { updates } = event; // updates 是一个包含要更新字段的对象

  // 安全过滤，只允许更新指定的字段
  const allowedFields = ['nickName', 'realName', 'avatarUrl'];
  const dataToUpdate = {};
  for (const key in updates) {
    if (allowedFields.includes(key)) {
      dataToUpdate[key] = updates[key];
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return { success: false, message: '没有有效的更新字段' };
  }

  try {
    await db.collection('Users').where({ _openid: OPENID }).update({
      data: dataToUpdate
    });
    return { success: true };
  } catch (e) {
    console.error('updateUserInfo error:', e);
    return { success: false, message: e.message };
  }
};