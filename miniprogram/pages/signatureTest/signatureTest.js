Page({
  data: {
    // data 中只存储用于 WXML 渲染和判断逻辑的简单数据
    points: [], // 存储所有笔画
    currentStroke: [], // 当前笔画
    isDrawing: false,
  },

  // 将 canvas 和 ctx 作为页面的直接属性，而不是放在 data 中
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
    
    this.setData({
      isDrawing: true,
      currentStroke: [[x, y]]
    });
    // 使用 this.ctx 直接调用
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  },

  handleTouchMove(e) {
    if (!this.data.isDrawing || !e.touches[0]) return;
    const { x, y } = e.touches[0];
    
    this.data.currentStroke.push([x, y]);
    // 使用 this.ctx 直接调用
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
    wx.showToast({ title: '已清空', icon: 'success' });
  },

  handleUndo() {
    if (this.data.points.length === 0) {
        wx.showToast({ title: '已无法撤销', icon: 'none' });
        return;
    };
    
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const newPoints = this.data.points.slice(0, -1);
    this.setData({ points: newPoints });
    
    newPoints.forEach(stroke => {
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0][0], stroke[0][1]);
      for(let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      this.ctx.stroke();
    });
  },

  handleSubmit() {
    if (this.data.points.length === 0) {
      wx.showToast({ title: '请先签名', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '正在生成图片...' });
    wx.canvasToTempFilePath({
      // 使用 this.canvas 直接引用
      canvas: this.canvas,
      success: res => {
        wx.hideLoading();
        console.log('签名图片临时路径:', res.tempFilePath);
        wx.showModal({
          title: '生成成功',
          content: '图片临时路径已打印在控制台，可用于后续上传。',
          showCancel: false
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('生成图片失败:', err);
        wx.showToast({ title: '生成图片失败', icon: 'error' });
      }
    });
  }
});