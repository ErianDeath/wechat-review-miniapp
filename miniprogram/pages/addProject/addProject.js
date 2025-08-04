const app = getApp();
const initialProjectState = {
  projectName: '',
  owner: '',
  description: '',
  criteria: [{ name: '', maxScore: '', description: '' }]
};

Page({
  data: {
    project: JSON.parse(JSON.stringify(initialProjectState)) // 使用深拷贝创建初始数据
},

    onLoad(options) {
      // 确保用户已登录，否则跳转到登录页
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        wx.reLaunch({ url: '/pages/login/login' });
      }
    },

    onInputChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({
            [`project.${field}`]: e.detail.value
        });
    },

    onCriterionChange(e) {
        const { index, field } = e.currentTarget.dataset;
        this.setData({
            [`project.criteria[${index}].${field}`]: e.detail.value
        });
    },

    addCriterion() {
        const newCriterion = { name: '', maxScore: '', description: '' };
        this.setData({
            'project.criteria': [...this.data.project.criteria, newCriterion]
        });
    },

    removeCriterion(e) {
        const index = e.currentTarget.dataset.index;
        let criteria = this.data.project.criteria;
        if (criteria.length <= 1) {
            wx.showToast({ title: '至少保留一项评分标准', icon: 'none' });
            return;
        }
        criteria.splice(index, 1);
        this.setData({
            'project.criteria': criteria
        });
    },

    handleSave() {
        const project = this.data.project;
        const userInfo = wx.getStorageSync('userInfo');

        if (!project.projectName.trim()) {
            wx.showToast({ title: '项目名称不能为空', icon: 'error' });
            return;
        }

        for (let i = 0; i < project.criteria.length; i++) {
            const item = project.criteria[i];
            if (!item.name.trim() || !item.maxScore) {
                wx.showToast({ title: `第${i+1}项评分标准的名称和分数不能为空`, icon: 'none' });
                return;
            }
            item.maxScore = Number(item.maxScore);
        }

        wx.showLoading({ title: '创建中...' });
        
        wx.cloud.callFunction({
            name: 'addProject',
            data: {
                project: {
                    ...project,
                    creatorInfo: { // 传入创建者信息，供云函数使用
                        nickName: userInfo.nickName,
                        avatarUrl: userInfo.avatarUrl
                    }
                }
            }
        }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
                wx.showToast({ title: '创建成功' });
                // 可以在此跳转到项目列表页或详情页
                // wx.switchTab({ url: '/pages/projectList/projectList' });
                this.setData({
                  project: JSON.parse(JSON.stringify(initialProjectState))
              });

              setTimeout(() => {
                  wx.switchTab({
                      url: '/pages/projectList/projectList'
                  });
              }, 1500); 

            } else {
                wx.showToast({ title: (res.result && res.result.message) || '创建失败', icon: 'error' });
            }
        }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '调用服务失败', icon: 'error' });
            console.error(err);
        });
    }
});