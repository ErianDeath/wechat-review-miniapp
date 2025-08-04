const app = getApp(); // 在文件顶部获取 App 实例
const db = wx.cloud.database();
const usersCollection = db.collection('Users');

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
  },

  handleLogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        this.onUserLogin(res.userInfo);
      },
      fail: () => {
        wx.showToast({
          title: '授权失败',
          icon: 'error'
        })
      }
    })
  },

  // --- 这是最终优化版的核心函数 ---
  async onUserLogin(userInfo) {
    wx.showLoading({ title: '登录中...' });

    try {
      // 1. 调用云函数获取 openid
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const { openid } = loginRes.result;

      // 2. 查询用户是否已存在
      const userQueryRes = await usersCollection.where({ _openid: openid }).get();
      let userRecord; // 用一个变量来存储最终的用户信息

      if (userQueryRes.data.length === 0) {
        // --- 3a. 新用户处理流程 ---
        console.log('新用户，正在创建记录...');
        // 准备好要存入数据库和全局状态的用户信息
        userRecord = {
          _openid: openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          role: 'evaluator', // 新用户默认为普通评委
          joinTime: new Date()
        };
        await usersCollection.add({ data: userRecord });
        console.log('新用户创建成功');

      } else {
        // --- 3b. 老用户处理流程 ---
        console.log('老用户，直接使用从数据库查询到的信息...');
        // 直接使用客户端查询到的用户信息，这里已经包含了role
        userRecord = userQueryRes.data[0];
      }

      // 4. (关键简化) 直接用已获取的 userRecord 设置全局状态
      // 这个步骤对新老用户都适用，且不再需要调用 app.fetchUserInfo()
      app.globalData.userInfo = userRecord;
      app.globalData.isAdmin = userRecord.role === 'admin';
      console.log('用户信息已设置完毕:', app.globalData);
      
      // 5. 跳转到项目列表页
      this.goToProjectList();

    } catch (err) {
      console.error('登录过程中发生错误', err);
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  goToProjectList() {
    wx.navigateTo({
      url: '/pages/projectList/projectList',
    })
  }
});