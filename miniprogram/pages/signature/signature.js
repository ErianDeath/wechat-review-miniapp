Page({
  data: {
    points: [], // 存储所有笔画，用于判断是否已签名
    currentStroke: [],
    isDrawing: false,
  },
  canvas: null,
  ctx: null,

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    // 使用 .in(this) 将查询作用域限定在当前页面，提高稳定性
    const query = wx.createSelectorQuery().in(this);
    query.select('#signatureCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
            console.error("无法获取Canvas节点");
            return;
        }

        // 增加对获取到的宽高的健壮性检查
        if (res[0].width === 0 || res[0].height === 0) {
            console.error("获取到的Canvas宽高为0，请检查WXML/WXSS中的样式设置");
            wx.showToast({
              title: '画板初始化失败',
              icon: 'error'
            })
            return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 使用 getWindowInfo，与 CSDN 示例对齐
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 关键修复：将 canvas 和 ctx 保存为页面实例的直接属性
        this.canvas = canvas;
        this.ctx = ctx;
        console.log('Canvas 初始化成功，尺寸:', canvas.width, canvas.height);
      });
  },

  handleTouchStart(e) {
    if (!this.ctx || !e.touches[0]) return;
    const { x, y } = e.touches[0];
    this.setData({ isDrawing: true, currentStroke: [[x, y]] });
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  },

  handleTouchMove(e) {
    if (!this.data.isDrawing || !e.touches[0]) return;
    const { x, y } = e.touches[0];
    this.data.currentStroke.push([x, y]);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  },

  handleTouchEnd() {
    if (!this.data.isDrawing) return;
    this.setData({
      isDrawing: false,
      points: [...this.data.points, this.data.currentStroke],
      currentStroke: []
    });
  },

  handleClear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.setData({ points: [] });
  },

  handleSubmit() {
    if (this.data.points.length === 0) {
      wx.showToast({ title: '您尚未签名', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '正在生成签名...' });
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: res => {
        wx.hideLoading();
        const tempFilePath = res.tempFilePath;
        
        // 使用 eventChannel 将签名图片路径返回给上一个页面
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit('acceptSignature', { signaturePath: tempFilePath });
        
        wx.navigateBack();
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '生成图片失败', icon: 'error' });
      }
    });
  }
});