const cloud_getProjectDetails = require('wx-server-sdk');
cloud_getProjectDetails.init({ env: cloud_getProjectDetails.DYNAMIC_CURRENT_ENV });
const db_getProjectDetails = cloud_getProjectDetails.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud_getProjectDetails.getWXContext();
  const { projectId } = event;

  try {
    // 1. 获取项目主体信息
    const projectRes = await db_getProjectDetails.collection('Projects').doc(projectId).get();
    const project = projectRes.data;

    // 2. 获取所有参与者的信息
    const participantsRes = await db_getProjectDetails.collection('Participants').aggregate()
      .match({ projectId: projectId })
      .lookup({
        from: 'Users',
        localField: 'userId',
        foreignField: '_openid',
        as: 'userInfo',
      })
      .end();
    
    const participants = participantsRes.list.map(p => {
        const userInfo = p.userInfo[0] || {};
        return {
            userId: p.userId,
            role: p.role,
            status: p.status,
            //nickName: userInfo.nickName,
            realName: userInfo.realName || userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
        }
    });

    // 3. (核心改动) 从 Scores 和 Signatures 集合获取当前用户的提交数据
    const scoreRes = await db_getProjectDetails.collection('Scores').where({ projectId, _openid: OPENID }).get();
    const signatureRes = await db_getProjectDetails.collection('Signatures').where({ projectId, userId: OPENID }).get();

    let mySubmittedData = null;
    if (scoreRes.data.length > 0) {
        mySubmittedData = {
            ...scoreRes.data[0], // 包含 totalScore, comments, scores
            signatureFileID: signatureRes.data.length > 0 ? signatureRes.data[0].signatureFileID : null
        };
    }

    return { success: true, project, participants, mySubmittedData };

  } catch (e) {
    console.error('getProjectDetails error:', e);
    return { success: false, message: '获取项目详情失败' };
  }
};