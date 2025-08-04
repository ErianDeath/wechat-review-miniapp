Page({
  data: {
    projectName: '',
    results: []
  },
  onLoad(options) {
    this.setData({ projectName: options.id === 'proj1' ? '科技成果 A' : '科技成果 B' });
    wx.cloud.callFunction({
      name: 'getResults',
      data: { projectId: options.id },
      success: res => {
        this.setData({ results: res.result.data });
      }
    });
  }
});