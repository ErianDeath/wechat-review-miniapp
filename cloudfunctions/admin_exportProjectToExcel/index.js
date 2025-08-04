const cloud = require('wx-server-sdk');
const xlsx = require('node-xlsx'); // 使用更轻量的 node-xlsx

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 辅助函数：格式化日期
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { projectId } = event;

  if (!projectId) {
    return { success: false, message: '缺少项目ID' };
  }

  try {
    // 1. 获取项目信息并进行权限校验
    const projectRes = await db.collection('Projects').doc(projectId).get();
    const project = projectRes.data;

    if (!project) {
        return { success: false, message: '项目不存在' };
    }
    if (project.creatorId !== OPENID) {
        return { success: false, message: '无权操作，只有项目创建者才能导出' };
    }

    // 2. 并行获取所有需要的数据
    const [participantsRes, scoresRes, signaturesRes] = await Promise.all([
        db.collection('Participants').where({ projectId }).get(),
        db.collection('Scores').where({ projectId }).get(),
        db.collection('Signatures').where({ projectId }).get()
    ]);

    const participants = participantsRes.data;
    const allScores = scoresRes.data;
    const allSignatures = signaturesRes.data;
    
    // 3. 数据预处理，创建方便查找的Map
    const userIds = participants.map(p => p.userId);
    const usersRes = await db.collection('Users').where({ _openid: db.command.in(userIds) }).get();
    const userMap = new Map(usersRes.data.map(u => [u._openid, u.realName || u.nickName]));
    const scoreMap = new Map(allScores.map(s => [s._openid, s]));
    const signatureMap = new Map(allSignatures.map(s => [s.userId, s.signatureFileID]));

    // 4. (核心优化) 批量获取所有签名图片的临时链接
    const signatureFileIDs = allSignatures.map(s => s.signatureFileID).filter(Boolean);
    let signatureUrlMap = new Map();
    if (signatureFileIDs.length > 0) {
        const tempUrlsRes = await cloud.getTempFileURL({ fileList: signatureFileIDs,
        expires: 259200
       });
        signatureUrlMap = new Map(tempUrlsRes.fileList.map(f => [f.fileID, f.tempFileURL]));
    }

    // 5. 使用 node-xlsx 构建Excel数据 (一人一行)
    const excelData = [];

    // -- 行 1-4: 项目信息 --
    excelData.push([`项目名称:`, project.projectName]);
    excelData.push([`负责人:`, project.owner]);
    excelData.push([`项目简介:`, project.description]);
    excelData.push([]); // 空行

    // -- 表头 --
    const criteriaHeaders = project.criteria.map(c => c.name);
    const headers = ['姓名', '总分', '评语', ...criteriaHeaders, '签名链接', '打分时间'];
    excelData.push(headers);

    // 6. 填充数据行
    participants.forEach(participant => {
        const userScore = scoreMap.get(participant.userId);
        const signatureFileID = signatureMap.get(participant.userId);
        const row = [];

        row.push(userMap.get(participant.userId) || '未知用户');
        
        if (userScore) {
            row.push(userScore.totalScore);
            row.push(userScore.comments || '');
            const scoreItemMap = new Map(userScore.scores.map(s => [s.name, s.score]));
            criteriaHeaders.forEach(header => {
                row.push(scoreItemMap.get(header) || 'N/A');
            });
            row.push(signatureUrlMap.get(signatureFileID) || '无签名');
            row.push(formatDate(userScore.submissionTime));
        } else {
            // 为未评分的用户填充占位符
            const emptyCells = Array(headers.length - 1).fill('未评分');
            row.push(...emptyCells);
        }
        excelData.push(row);
    });
    
    // -- 最后一行: 平均分 --
    if (allScores.length > 0) {
        excelData.push([]); // 空行
        const avgTotalScore = allScores.reduce((sum, s) => sum + s.totalScore, 0) / allScores.length;
        const avgRow = ['项目平均总分:', avgTotalScore.toFixed(2)];
        excelData.push(avgRow);
    }

    // 7. 生成并上传Excel
    const buffer = xlsx.build([{ name: project.projectName, data: excelData }]);
    const uploadRes = await cloud.uploadFile({
        cloudPath: `exports/${project.projectName}-评审报告(链接版).xlsx`,
        fileContent: buffer,
    });

    return { success: true, fileID: uploadRes.fileID };

  } catch (e) {
    console.error('admin_exportProjectToExcel error:', e);
    return { success: false, message: '导出失败: ' + e.message };
  }
};