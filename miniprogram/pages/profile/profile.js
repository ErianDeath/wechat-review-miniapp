const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    userInfo: null,
    displayAvatarUrl: '', // 用于显示的https链接
    myProjects: [],
    showNameModal: false,
    realNameInput: ''
  },

  onShow() {
    // 使用 onShow 确保每次进入页面都刷新数据
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ userInfo });
    this.loadMyProjects(userInfo._openid);
    this.loadDisplayAvatar(userInfo.avatarUrl);
  },

  loadMyProjects(openid) {
    db.collection('Projects').where({ creatorId: openid })
      .orderBy('creationTime', 'desc')
      .get().then(res => {
        this.setData({ myProjects: res.data });
      });
  },

  async loadDisplayAvatar(avatarFileID) {
    if (!avatarFileID) {
      // 如果用户没有上传过头像，则使用默认图
      this.setData({ displayAvatarUrl: '/images/default_avatar.png' });
      return;
    }
    // 将 fileID 转换为可显示的 https 链接
    const res = await wx.cloud.getTempFileURL({ fileList: [avatarFileID] });
    if (res.fileList.length > 0) {
      this.setData({ displayAvatarUrl: res.fileList[0].tempFileURL });
    }
  },

  // --- 信息修改 ---
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail; // 这是用户选择的头像的临时路径
    wx.showLoading({ title: '上传中...' });

    wx.cloud.uploadFile({
      cloudPath: `avatars/${app.globalData.openid}-${Date.now()}.png`,
      filePath: avatarUrl,
    }).then(res => {
      const fileID = res.fileID;
      this.updateUserInfo({ avatarUrl: fileID }, () => {
        // 上传成功后，立刻更新界面显示的头像
        this.setData({ displayAvatarUrl: avatarUrl });
      });
    }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'error' });
    });
  },

  showNicknameModal() {
    wx.hideTabBar();
    this.setData({
      showNicknameModal: true,
      nicknameInput: this.data.userInfo.nickName || ''
    });
  },
  hideNicknameModal() {
    wx.showTabBar();
    this.setData({ showNicknameModal: false });
  },
  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value });
  },
  onConfirmNicknameChange() {
    const newNickname = this.data.nicknameInput;
    if (newNickname === this.data.userInfo.nickName) {
        this.hideNicknameModal();
        return;
    }
    this.updateUserInfo({ nickName: newNickname });
    this.hideNicknameModal();
  },

  showRealNameModal() {
    wx.hideTabBar();
    this.setData({
      showNameModal: true,
      realNameInput: this.data.userInfo.realName || ''
    });
  },
  hideRealNameModal() {
    wx.showTabBar();
    this.setData({ showNameModal: false });
  },
  onNameInput(e) {
    this.setData({ realNameInput: e.detail.value });
  },
  onConfirmNameChange() {
    const newRealName = this.data.realNameInput.trim();
    if (!newRealName) {
      wx.showToast({ title: '姓名不能为空', icon: 'error' });
      return;
    }
    this.updateUserInfo({ realName: newRealName });
    this.hideRealNameModal();
  },

  // 封装统一的更新函数
  updateUserInfo(updates, successCallback) {
    wx.showLoading({ title: '更新中...' });
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: { updates: updates }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '更新成功' });
        // 更新本地缓存和全局数据
        const newUserInfo = { ...this.data.userInfo, ...updates };
        this.setData({ userInfo: newUserInfo });
        app.globalData.userInfo = newUserInfo;
        wx.setStorageSync('userInfo', newUserInfo);
        if (successCallback) successCallback();
      } else {
        wx.showToast({ title: '更新失败', icon: 'error' });
      }
    });
  },

  // --- 退出登录 ---
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除所有本地缓存
          wx.clearStorageSync();
          // 重置全局变量
          app.globalData.userInfo = null;
          app.globalData.openid = null;
          app.globalData.isLoggedIn = false;
          // 强制重启并跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login',
          });
        }
      }
    });
  },

  goToProject(e) {
    const projectId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/scoring/scoring?id=${projectId}`
    });
  }
});