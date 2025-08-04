App({
  onLaunch: function () {
    // 初始化云开发环境必须在 onLaunch 中首先执行
    wx.cloud.init({
      env: 'test-env-3gepwuu6afabf416', // !!! 请替换成你自己的环境ID
      traceUser: true,
    });
    
    this.globalData = {
      userInfo: null,
      openid: null,
      isLoggedIn: false
    };

    // 尝试从缓存中恢复登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.openid = userInfo._openid;
        this.globalData.isLoggedIn = true;
    };

  },

  handleLogin: function(userInfo, realName) { // 增加 realName 参数
    return new Promise((resolve, reject) => {
      wx.showLoading({ title: '登录中...' });
      wx.cloud.callFunction({ 
        name: 'login', 
        data: { 
          userInfo: userInfo,
          realName: realName // 将 realName 传递给云函数
        } 
      }).then(loginRes => {
        wx.hideLoading();
        if (loginRes.result && loginRes.result.success) {
          const userRecord = loginRes.result.data;
          this.globalData.userInfo = userRecord;
          this.globalData.openid = userRecord._openid;
          this.globalData.isLoggedIn = true;
          wx.setStorageSync('userInfo', userRecord);
          resolve(userRecord);
        } else {
          reject(loginRes.result.message || '云函数返回失败');
        }
      }).catch(err => {
        wx.hideLoading();
        reject(err);
      });
    });
  }
});