const db = wx.cloud.database();
Page({
    data: { templates: [] },
    onShow() { this.loadTemplates(); },
    onLoad() { wx.setNavigationBarTitle({ title: '标准管理' }) },
    loadTemplates() {
        wx.showLoading({ title: '加载中...' });
        db.collection('EvaluationTemplates').get().then(res => {
            this.setData({ templates: res.data });
            wx.hideLoading();
        });
    },
    goToAdd() { wx.navigateTo({ url: '../templateEdit/templateEdit' }); },
    goToEdit(e) { wx.navigateTo({ url: `../templateEdit/templateEdit?id=${e.currentTarget.dataset.id}` }); },
    handleSetActive(e) {
        const templateId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认操作',
            content: '确定要将此模板设为当前使用的标准吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '设置中...' });
                    wx.cloud.callFunction({
                        name: 'setActiveTemplate',
                        data: { templateId: templateId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result.success) {
                            wx.showToast({ title: '设置成功' });
                            this.loadTemplates();
                        } else {
                            wx.showToast({ title: res.result.message || '设置失败', icon: 'error' });
                        }
                    });
                }
            }
        });
    },
    handleDelete(e) {
        const templateId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个模板吗？此操作不可逆。',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中...' });
                    wx.cloud.callFunction({
                        name: 'deleteTemplate',
                        data: { templateId: templateId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result.success) {
                            wx.showToast({ title: '删除成功' });
                            this.loadTemplates();
                        } else {
                            wx.showToast({ title: res.result.message || '删除失败', icon: 'error' });
                        }
                    });
                }
            }
        });
    }
});