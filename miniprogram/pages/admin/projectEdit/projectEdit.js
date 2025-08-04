const db = wx.cloud.database();
Page({
    data: {
        project: { _id: null, projectName: '', description: '' },
        isEditMode: false
    },
    onLoad(options) {
        if (options.id) {
            this.setData({ isEditMode: true });
            wx.setNavigationBarTitle({ title: '编辑项目' });
            wx.showLoading({ title: '加载中' });
            db.collection('Projects').doc(options.id).get().then(res => {
                this.setData({ project: res.data });
                wx.hideLoading();
            });
        } else {
            wx.setNavigationBarTitle({ title: '新增项目' });
        }
    },
    onInputChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [`project.${field}`]: e.detail.value });
    },
    handleSave() {
        if (!this.data.project.projectName) {
            wx.showToast({ title: '项目名称不能为空', icon: 'error' });
            return;
        }
        wx.showLoading({ title: '保存中...' });
        wx.cloud.callFunction({
            name: 'addOrUpdateProject',
            data: { project: this.data.project }
        }).then(res => {
            wx.hideLoading();
            if (res.result.success) {
                wx.showToast({ title: '保存成功' });
                wx.navigateBack();
            } else {
                wx.showToast({ title: res.result.message || '保存失败', icon: 'error' });
            }
        });
    }
});