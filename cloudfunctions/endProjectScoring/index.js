const cloud_endProjectScoring = require('wx-server-sdk');
cloud_endProjectScoring.init({ env: cloud_endProjectScoring.DYNAMIC_CURRENT_ENV });
const db_endProjectScoring = cloud_endProjectScoring.database();

exports.main = async (event, context) => {
    const { OPENID } = cloud_endProjectScoring.getWXContext();
    const { projectId } = event;

    try {
        // 1. 权限校验：验证调用者是否为项目创建者
        const projectRes = await db_endProjectScoring.collection('Projects').doc(projectId).field({ creatorId: true }).get();
        
        if (!projectRes.data || projectRes.data.creatorId !== OPENID) {
            console.error(`权限校验失败: 用户 ${OPENID} 尝试结束项目 ${projectId}, 但项目创建者是 ${projectRes.data ? projectRes.data.creatorId : '未知'}`);
            return { success: false, message: '无权操作，只有项目创建者才能结束评审' };
        }

        // 2. 更新项目状态
        await db_endProjectScoring.collection('Projects').doc(projectId).update({
            data: {
                status: 'completed'
            }
        });

        return { success: true };

    } catch (e) {
        console.error('endProjectScoring error:', e);
        return { success: false, message: '操作失败: ' + e.message };
    }
};