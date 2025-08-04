Page({
  onLoad: function (options) {
      wx.setNavigationBarTitle({ title: '后台管理' });
  },
  goToProjectManager() { wx.navigateTo({ url: '../projectManager/projectManager' }) },
  goToTemplateManager() { wx.navigateTo({ url: '../templateManager/templateManager' }) }
});