const cloud_addProject = require('wx-server-sdk');
cloud_addProject.init({ env: cloud_addProject.DYNAMIC_CURRENT_ENV });
const db_addProject = cloud_addProject.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud_addProject.getWXContext();
  const { project } = event;

  try {
    const result = await db_addProject.runTransaction(async transaction => {
      // 1. 在 Projects 集合中创建项目
      const projectRes = await transaction.collection('Projects').add({
        data: {
          projectName: project.projectName,
          owner: project.owner,
          description: project.description,
          criteria: project.criteria,
          creatorId: OPENID,
          status: 'pending',
          creationTime: new Date()
        }
      });

      const newProjectId = projectRes._id;
      if (!newProjectId) {
        await transaction.rollback('创建项目失败');
        return;
      }

      // 2. 在 Participants 集合中将创建者添加为参与者
      await transaction.collection('Participants').add({
        data: {
          projectId: newProjectId,
          userId: OPENID,
          role: 'creator',
          status: 'pending', // 初始状态为待评分
          joinTime: new Date()
        }
      });

      // (已移除) 不再需要在 Scores 集合中创建聚合记录

      return { success: true, projectId: newProjectId };
    });
    return result;
  } catch (e) {
    console.error('addProject transaction error:', e);
    return { success: false, message: e.message };
  }
};