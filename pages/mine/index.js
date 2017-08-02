const {AV,util} = require('../../utils/common.js');
const app = getApp();
Page({
  data:{
    show:true
  },
  init(){
    this.querySurveyCount();
    //this.querySurveyList();
  },
  onLoad:function(options){
    // 页面初始化 options为页面跳转所带来的参数
    //util.wxlogin(app, this.init);
  },
  onReady:function(){
    // 页面渲染完成
   
  },
  onShow:function(){
    
  },
  onHide:function(){
    // 页面隐藏
  },
  onUnload:function(){
    // 页面关闭
  },
  

  querySurveyCount(){
    let currPage = this;
    let {limit,page} = this.data;
    let survey = new AV.Query('survey');
    let userInfo = app.globalData.userInfo;
    this.setData({userInfo});
    survey.equalTo('owner', app.globalData.userId);
    survey.count().then(function (surveyCount) {
        //let noData = surveyCount>0?false:true;
        let show = true;
        currPage.setData({surveyCount,show});
       
    }, function (error) {
    });
  },
  create(){
    wx.navigateTo({
      url: '/pages/mySurvey/index',
    });
  },
  part(){
    wx.navigateTo({
      url: '/pages/participate/index',
    });
  },
  about() {
    wx.navigateTo({
      url: '/pages/about/index',
    });
  }
 
})