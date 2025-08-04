const db = wx.cloud.database();
Page({
    data: { projects: [] },
    onShow() { this.loadProjects(); },
    onLoad() { wx.setNavigationBarTitle({ title: '项目管理' }); },
    loadProjects() {
        wx.showLoading({ title: '加载中...' });
        db.collection('Projects').orderBy('creationTime', 'desc').get().then(res => {
            this.setData({ projects: res.data });
            wx.hideLoading();
        }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '加载失败', icon: 'error' });
        });
    },
    goToAdd() { wx.navigateTo({ url: '../projectEdit/projectEdit' }); },
    goToEdit(e) { wx.navigateTo({ url: `../projectEdit/projectEdit?id=${e.currentTarget.dataset.id}` }); },
    handleDelete(e) {
        const projectId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '删除项目将同时删除所有相关评分，确定吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中...' });
                    wx.cloud.callFunction({
                        name: 'deleteProject',
                        data: { projectId: projectId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result.success) {
                            wx.showToast({ title: '删除成功' });
                            this.loadProjects();
                        } else {
                            wx.showToast({ title: res.result.message || '删除失败', icon: 'error' });
                        }
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '删除失败', icon: 'error' });
                    });
                }
            }
        });
    }
});