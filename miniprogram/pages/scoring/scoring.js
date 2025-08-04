const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    projectId: '',
    project: null,
    isCreator: false,
    participants: [],
    scores: [],
    totalScore: 0,
    comments: '',
    hasSubmitted: false,
    signatureImagePath: '',
  },

  onLoad(options) {
    const projectId = options.id || (options.scene ? decodeURIComponent(options.scene) : null);
    if (!projectId) {
      wx.showToast({ title: '项目ID无效', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this.setData({ projectId });

    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (!app.globalData.userInfo) {
        app.globalData.userInfo = userInfo;
        app.globalData.openid = userInfo._openid;
    }

    if (options.share === 'true') {
      wx.showLoading({ title: '加入项目中...' });
      wx.cloud.callFunction({ name: 'joinProject', data: { projectId, userInfo } }).then(() => {
        wx.hideLoading();
        this.loadPageData(projectId, userInfo);
      });
    } else {
      this.loadPageData(projectId, userInfo);
    }
  },

  async loadPageData(projectId, userInfo) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({ name: 'getProjectDetails', data: { projectId } });
      wx.hideLoading();

      if (res.result && res.result.success) {
        // 关键改动：确认不再解构 averageScores
        const { project, participants, mySubmittedData } = res.result;
        
        this.setData({
          project,
          participants,
          isCreator: project.creatorId === userInfo._openid,
        });
        wx.setNavigationBarTitle({ title: project.projectName });

        if (mySubmittedData) {
          const signatureUrl = await this.getSignatureUrl(mySubmittedData.signatureFileID);
          this.setData({
            hasSubmitted: true,
            scores: mySubmittedData.scores,
            totalScore: mySubmittedData.totalScore,
            comments: mySubmittedData.comments,
            signatureImagePath: signatureUrl
          });
        } else {
          const initialScores = project.criteria.map(item => ({ name: item.name, score: 0 }));
          this.setData({ scores: initialScores });
        }
      } else {
        wx.showToast({ title: '加载失败', icon: 'error' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'error' });
    }
  },

  async getSignatureUrl(fileID) {
    if (!fileID) return '';
    const res = await wx.cloud.getTempFileURL({ fileList: [fileID] });
    return res.fileList[0].tempFileURL;
  },

  // --- 打分逻辑 ---
  handleSliderChange(e) {
    const { index } = e.currentTarget.dataset;
    const score = e.detail.value;
    this.setData({ [`scores[${index}].score`]: score });
    this.updateTotalScore();
  },
  handleScoreInput(e) {
    const { index } = e.currentTarget.dataset;
    let score = Number(e.detail.value);
    const maxScore = this.data.project.criteria[index].maxScore;
    if (score > maxScore) score = maxScore;
    this.setData({ [`scores[${index}].score`]: score });
    this.updateTotalScore();
  },
  updateTotalScore() {
    const total = this.data.scores.reduce((sum, item) => sum + (item.score || 0), 0);
    this.setData({ totalScore: total });
  },
  onCommentsInput(e) { this.setData({ comments: e.detail.value }); },

  goToSignaturePage() {
    wx.navigateTo({
      url: '/pages/signature/signature',
      events: {
        acceptSignature: (data) => {
          console.log('接收到签名图片路径:', data.signaturePath);
          this.setData({
            signatureImagePath: data.signaturePath
          });
        }
      }
    });
  },

  clearSignature() {
    this.setData({
      signatureImagePath: ''
    });
  },

  // --- 按钮事件 ---
  handleSubmit() {
    if (!this.data.signatureImagePath) {
      wx.showToast({ title: '请先完成签名', icon: 'error' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    
    wx.cloud.uploadFile({
      cloudPath: `signatures/${this.data.projectId}/${app.globalData.openid}.png`,
      filePath: this.data.signatureImagePath,
    }).then(uploadRes => {
      wx.cloud.callFunction({
        name: 'submitScore',
        data: {
          projectId: this.data.projectId,
          totalScore: this.data.totalScore,
          comments: this.data.comments,
          scores: this.data.scores,
          signatureFileID: uploadRes.fileID,
        }
      }).then(submitRes => {
        wx.hideLoading();
        if (submitRes.result.success) {
          wx.showToast({ title: '提交成功' });
          this.setData({ hasSubmitted: true });
        } else {
          wx.showToast({ title: submitRes.result.message || '提交失败', icon: 'error' });
        }
      });
    }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '签名上传失败', icon: 'error' });
    });
  },

  onShareAppMessage() {
    return {
      title: `邀请您参与项目“${this.data.project.projectName}”的评审`,
      path: `/pages/scoring/scoring?id=${this.data.projectId}&share=true`,
    };
  },

  goToEdit() {
    wx.navigateTo({ url: `/pages/addProject/addProject?id=${this.data.projectId}` });
  },

  handleEndProject() {
    wx.showModal({
      title: '确认操作',
      content: '结束后，项目状态将变为“已完成”，确定吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          wx.cloud.callFunction({
            name: 'endProjectScoring',
            data: { projectId: this.data.projectId }
          }).then(endRes => {
            wx.hideLoading();
            if (endRes.result.success) {
              wx.showToast({ title: '项目已结束' });
              this.loadPageData(this.data.projectId, app.globalData.userInfo);
            } else {
              wx.showToast({ title: '操作失败', icon: 'error' });
            }
          });
        }
      }
    });
  },

  exportResult() {
    wx.showLoading({ title: '正在生成报告...' });
    wx.cloud.callFunction({ 
      name: 'admin_exportProjectToExcel', 
      data: { projectId: this.data.projectId } 
    }).then(res => {
      if (res.result.success) {
        wx.cloud.getTempFileURL({
          fileList: [res.result.fileID],
          success: fileRes => {
            wx.hideLoading();
            wx.setClipboardData({
              data: fileRes.fileList[0].tempFileURL,
              success: () => {
                wx.showModal({
                  title: '导出成功',
                  content: 'Excel文件下载链接已复制到剪贴板，请在手机或电脑浏览器中打开下载。',
                  showCancel: false,
                });
              }
            });
          }
        });
      } else {
        wx.hideLoading();
        wx.showToast({ title: res.result.message || '导出失败', icon: 'error' });
      }
    }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '调用服务失败', icon: 'error' });
    });
  }
});
