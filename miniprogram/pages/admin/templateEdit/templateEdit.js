const db = wx.cloud.database();
Page({
    data: {
        template: {
            _id: null,
            templateName: '',
            isActive: false,
            criteria: [{ name: '', maxScore: '', description: '' }]
        },
        isEditMode: false
    },
    onLoad(options) {
        if (options.id) {
            this.setData({ isEditMode: true });
            wx.setNavigationBarTitle({ title: '编辑标准' });
            wx.showLoading({ title: '加载中' });
            db.collection('EvaluationTemplates').doc(options.id).get().then(res => {
                this.setData({ template: res.data });
                wx.hideLoading();
            });
        } else {
            wx.setNavigationBarTitle({ title: '新增标准' });
        }
    },
    onInputChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [`template.${field}`]: e.detail.value });
    },
    onCriterionChange(e) {
        const { index, field } = e.currentTarget.dataset;
        this.setData({ [`template.criteria[${index}].${field}`]: e.detail.value });
    },
    addCriterion() {
        const newCriterion = { name: '', maxScore: '', description: '' };
        this.setData({
            'template.criteria': [...this.data.template.criteria, newCriterion]
        });
    },
    removeCriterion(e) {
        const index = e.currentTarget.dataset.index;
        let criteria = this.data.template.criteria;
        criteria.splice(index, 1);
        this.setData({ 'template.criteria': criteria });
    },
    handleSave() {
        const template = this.data.template;
        if (!template.templateName) {
            wx.showToast({ title: '模板名称不能为空', icon: 'error' });
            return;
        }
        for (let i = 0; i < template.criteria.length; i++) {
            const item = template.criteria[i];
            if (!item.name || !item.maxScore) {
                wx.showToast({ title: `第${i+1}项评分标准的名称和分数不能为空`, icon: 'none' });
                return;
            }
            item.maxScore = Number(item.maxScore);
        }

        wx.showLoading({ title: '保存中...' });
        wx.cloud.callFunction({
            name: 'addOrUpdateTemplate',
            data: { template: template }
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