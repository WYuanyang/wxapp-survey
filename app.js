//app.js
// const AV = require('utils/av-weapp-min.js');
const {AV,util} = require('utils/common.js');
App({
  globalData:{
    userInfo:'',
    userId:''
  },
  onLaunch() {
  
  },
  onShow(){
    
  },
  
  
  onPullDownRefresh(){
    wx.stopPullDownRefresh()
  },
  onError(msg) {
    
  }
  
})