const app = getApp();
Page({
  data: {
    showNameModal: false,
    realName: ''
  },
  
  // 临时存储微信授权信息
  tempUserInfo: null,

  // 第一步：用户点击“微信授权登录”，调用新版 API
  handleWxLogin() {
    wx.getUserProfile({
      desc: '用于完善您的会员资料',
      success: (res) => {
        // 将获取到的用户信息临时存储起来
        this.tempUserInfo = res.userInfo;
        // 弹出输入姓名的窗口
        this.setData({ showNameModal: true });
      },
      fail: () => {
        wx.showToast({ title: '您已取消微信授权', icon: 'none' });
      }
    });
  },

  // 弹窗中的输入框事件
  onNameInput(e) {
    this.setData({ realName: e.detail.value });
  },

  // 弹窗中的“拒绝授权”
  onDecline() {
    this.setData({ showNameModal: false, realName: '' });
    this.tempUserInfo = null;
    wx.showToast({ title: '已取消', icon: 'none' });
  },

  // 弹窗中的“确认授权”，执行最终登录
  onConfirmName() {
    if (!this.data.realName.trim()) {
      wx.showToast({ title: '姓名不能为空', icon: 'error' });
      return;
    }

    if (!this.tempUserInfo) {
        wx.showToast({ title: '微信信息获取失败，请重试', icon: 'error' });
        return;
    }

    wx.showLoading({ title: '登录中...' });
    app.handleLogin(this.tempUserInfo, this.data.realName.trim()).then(userInfo => {
      wx.hideLoading();
      this.setData({ showNameModal: false });
      wx.showToast({ title: '登录成功' });
      wx.switchTab({
        url: '/pages/projectList/projectList'
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '登录失败', icon: 'error' });
      console.error("登录流程出错:", err);
    });
  }
});