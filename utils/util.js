const AV = require('av-weapp-min.js');
const app = getApp();
function formatDayAndTime(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()

  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()


  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}
function formatDay(date,str) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  return [year, month, day].map(formatNumber).join(str);
}
function formatTime(date,str) {
  var hour = date.getHours()
  var minute = date.getMinutes()
  // var second = date.getSeconds()
  return [hour, minute].map(formatNumber).join(str);
}
function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}
function setBtnDefault(page){
  const st = setTimeout(function(){
        page.setData({
          btnLoad: !page.data.btnLoad,
          btnDisabled: !page.data.btnDisabled
        });
        clearTimeout(st);
  },1500);
}
function setBtnLoading(page){
    page.setData({
      btnLoad: !page.data.btnLoad,
      btnDisabled: !page.data.btnDisabled
    })
    setBtnDefault(page);
}
function wxlogin(app,cb){
    wx.showLoading({
      title: '加载中...',
      mask:true
    });
    AV.init({
      appId: 'SEe3ofqL3ALU13Q1a8bNMrdT-gzGzoHsz',
      appKey: 'xTYLAhivGL7V5U3DHNMGgILb',
    });
    AV.User.loginWithWeapp().then(user => {
      // console.log(user);
      wx.getUserInfo({
        success: ({userInfo}) => {
          // 更新当前用户的信息
          wx.hideLoading();
          user.set(userInfo).save().then(user => {
            // 成功，此时可在控制台中看到更新后的用户信息
            app.globalData.userInfo = user.toJSON();
            //app.globalData.userId = app.globalData.userInfo.objectId;
            
          });
        },
        fail:function(){
          wx.hideLoading();
        }
        
        });
      app.globalData.userId = user.id;
      cb();
    }).catch(function(){
        wx.showToast({
          title: '连接超时',
          duration: 3000,
          icon:'loading',
          mask:true
        })
     });
}
module.exports = {
  formatDayAndTime,
  formatDay,
  formatTime,
  setBtnLoading,
  wxlogin
}
