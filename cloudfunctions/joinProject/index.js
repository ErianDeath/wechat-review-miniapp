const cloud_joinProject = require('wx-server-sdk');
cloud_joinProject.init({ env: cloud_joinProject.DYNAMIC_CURRENT_ENV });
const db_joinProject = cloud_joinProject.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud_joinProject.getWXContext();
  const { projectId } = event;
  try {
    // 检查是否已加入
    const existing = await db_joinProject.collection('Participants').where({
      projectId: projectId,
      userId: OPENID
    }).count();

    if (existing.total > 0) {
      return { success: true, message: '已是项目成员' };
    }

    // 添加新参与者记录
    await db_joinProject.collection('Participants').add({
      data: {
        projectId: projectId,
        userId: OPENID,
        role: 'reviewer', // 加入者角色为评委
        status: 'pending',
        joinTime: new Date()
      }
    });
    return { success: true, message: '成功加入' };
  } catch (e) {
    console.error('joinProject error:', e);
    return { success: false, message: e.message };
  }
};