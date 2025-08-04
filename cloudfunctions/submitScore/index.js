const cloud_submitScore = require('wx-server-sdk');
cloud_submitScore.init({ env: cloud_submitScore.DYNAMIC_CURRENT_ENV });
const db_submitScore = cloud_submitScore.database();

exports.main = async (event, context) => {
    const { OPENID } = cloud_submitScore.getWXContext();
    const { projectId, totalScore, comments, scores, signatureFileID } = event;
    
    try {
        // 检查用户是否已提交过评分
        const existingScore = await db_submitScore.collection('Scores').where({
            projectId: projectId,
            _openid: OPENID
        }).count();

        if (existingScore.total > 0) {
            return { success: false, message: '您已提交过评分' };
        }

        // 使用数据库事务确保原子性
        await db_submitScore.runTransaction(async transaction => {
            const now = new Date();
            
            // 1. 在 Scores 集合中添加独立的评分记录
            await transaction.collection('Scores').add({
                data: {
                    _openid: OPENID,
                    projectId,
                    totalScore,
                    comments,
                    scores,
                    submissionTime: now
                }
            });

            // 2. 在 Signatures 集合中添加签名记录
            await transaction.collection('Signatures').add({
                data: {
                    userId: OPENID,
                    projectId,
                    signatureFileID,
                    submissionTime: now
                }
            });

            // 3. 更新当前用户在 Participants 集合中的状态为 'completed'
            const updateParticipant = await transaction.collection('Participants').where({
                projectId: projectId,
                userId: OPENID
            }).update({
                data: {
                    status: 'completed'
                }
            });

            if (updateParticipant.stats.updated === 0) {
                await transaction.rollback('更新参与状态失败，请确认您是该项目的参与者。');
            }
        });

        return { success: true };

    } catch (e) {
        console.error('submitScore error:', e);
        return { success: false, message: '提交失败: ' + e.message };
    }
};