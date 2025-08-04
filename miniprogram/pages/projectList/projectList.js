const app = getApp();
const util = require('../../utils/util.js');
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    projects: [],
    openid: '',
    isLoading: true
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ openid: userInfo._openid });
    this.loadProjects();
  },

  onPullDownRefresh() {
    this.loadProjects().then(() => wx.stopPullDownRefresh());
  },

  async loadProjects() {
    this.setData({ isLoading: true });
    try {
      // 1. 获取与用户相关的项目列表
      const projectRes = await wx.cloud.callFunction({ name: 'getProjectListForUser' });
      if (!projectRes.result || !projectRes.result.success) {
        throw new Error('Failed to fetch projects');
      }
      let projects = projectRes.result.data;

      if (projects.length > 0) {
        // 2. (核心改动) 从 Participants 集合获取当前用户的个人评分状态
        const projectIds = projects.map(p => p._id);
        const participationRes = await db.collection('Participants').where({
          userId: this.data.openid,
          projectId: _.in(projectIds)
        }).get();
        
        // 创建一个 projectId -> status 的映射表，方便快速查找
        const participationStatusMap = new Map();
        participationRes.data.forEach(p => {
            participationStatusMap.set(p.projectId, p.status);
        });

        // 3. 合并数据
        projects = projects.map(p => {
          p.formattedTime = util.formatTime(new Date(p.creationTime));
          // 用户的个人评分状态，取决于他在 Participants 集合中的 status
          p.currentUserScored = participationStatusMap.get(p._id) === 'completed';
          return p;
        });

        // 4. 智能排序逻辑保持不变
        projects.sort((a, b) => {
          const getPriority = (p) => {
            if (p.status === 'pending' && !p.currentUserScored) return 1;
            if (p.status === 'pending' && p.currentUserScored) return 2;
            if (p.status === 'completed') return 3;
            return 4;
          };
          const priorityA = getPriority(a);
          const priorityB = getPriority(b);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return new Date(b.creationTime) - new Date(a.creationTime);
        });
      }
      
      this.setData({
        projects: projects,
        isLoading: false
      });

    } catch (err) {
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
      console.error("Failed to load projects:", err);
    }
  },

  goToScoring(e) {
    const projectId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/scoring/scoring?id=${projectId}`
    });
  }
});