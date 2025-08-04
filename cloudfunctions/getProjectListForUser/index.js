const cloud_getProjectListForUser = require('wx-server-sdk');
cloud_getProjectListForUser.init({ env: cloud_getProjectListForUser.DYNAMIC_CURRENT_ENV });
const db_getProjectListForUser = cloud_getProjectListForUser.database();
const _ = db_getProjectListForUser.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud_getProjectListForUser.getWXContext();
  try {
    // 步骤 1: 获取用户作为“参与者”的项目ID
    const participationRes = await db_getProjectListForUser.collection('Participants')
      .where({ userId: OPENID })
      .field({ projectId: true })
      .get();
    const participatedProjectIds = participationRes.data.map(p => p.projectId);

    // 步骤 2: 获取用户作为“创建者”的项目ID
    const creationRes = await db_getProjectListForUser.collection('Projects')
      .where({ creatorId: OPENID })
      .field({ _id: true })
      .get();
    const createdProjectIds = creationRes.data.map(p => p._id);

    // 步骤 3: 合并两个ID列表并去重，确保每个项目ID只出现一次
    const allProjectIds = [...new Set([...participatedProjectIds, ...createdProjectIds])];

    // 如果最终ID列表为空，直接返回空数组
    if (allProjectIds.length === 0) {
      return { success: true, data: [] };
    }

    // 步骤 4: 根据最终的项目ID列表，查询所有项目详情
    const projectsRes = await db_getProjectListForUser.collection('Projects').where({
      _id: _.in(allProjectIds)
    }).orderBy('creationTime', 'desc').get();

    return { success: true, data: projectsRes.data };
  } catch (e) {
    console.error('getProjectListForUser error:', e);
    return { success: false, message: e.message };
  }
};