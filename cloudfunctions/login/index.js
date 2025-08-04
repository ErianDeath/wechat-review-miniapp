const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { userInfo, realName } = event; // 接收 realName

  // 增加健壮性检查，防止 userInfo 为空
  if (!userInfo || !userInfo.nickName) {
    return { success: false, message: '获取微信用户信息失败' };
  }

  try {
    const userRes = await db.collection('Users').where({ _openid: OPENID }).get();

    if (userRes.data.length > 0) {
      // 老用户，更新姓名
      const user = userRes.data[0];
      if (user.realName !== realName) {
        await db.collection('Users').doc(user._id).update({
          data: { realName: realName }
        });
        user.realName = realName;
      }
      return { success: true, data: user };
    } else {
      // 新用户，创建记录
      
      // --- 关键修复：增加健壮性检查 ---
      // 在创建新用户前，确保从前端传递过来的 userInfo 是有效的
      if (!userInfo || !userInfo.nickName) {
        console.error('创建新用户失败：缺少有效的 userInfo', event);
        return { success: false, message: '获取用户信息失败，无法创建新用户' };
      }
      // --- 修复结束 ---

      const newUser = {
        _openid: OPENID,
        nickName: userInfo.nickName,
        //avatarUrl: userInfo.avatarUrl,
        realName: realName, // 存储 realName
        role: 'evaluator',
        creationTime: new Date()
      };
      const addRes = await db.collection('Users').add({ data: newUser });
      return { success: true, data: { _id: addRes._id, ...newUser } };
    }
  } catch (e) {
    console.error('Login function error:', e);
    return { success: false, message: e.message };
  }
};
