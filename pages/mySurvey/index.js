const {AV,util} = require('../../utils/common.js');
const app = getApp();
Page({
  data:{
    currLiActiveIndex:0,
    surveyList:[],
    totalPages:0,
    limit:10,
    page:1,
    noData:false,
    // noMoreData:false,
    show:false,
    noMoreDataTxt:''
  },
  init(){
    this.querySurveyCount();
    this.querySurveyList();
  },
  onLoad:function(options){
    // 页面初始化 options为页面跳转所带来的参数
  },
  onReady:function(){
    // 页面渲染完成
    util.wxlogin(app, this.init);
  },
  onShow:function(){
    // 页面显示
    // this.onPullDownRefresh();
    //util.wxlogin(app,this.init);
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
        let noData = surveyCount>0?false:true;
        let totalPages = Math.ceil(surveyCount/limit);
        // let totalPages = Math.ceil(0/limit);
        let noMoreDataTxt = totalPages > page ? "下拉加载更多" :"没有更多数据";
        currPage.setData({surveyCount,totalPages,noData,noMoreDataTxt});
       
    }, function (error) {
    });
  },
  querySurveyList(){  
    let currPage = this;
    let {limit,page} = currPage.data;
    let skip = page*limit;
    const cql = `select title,voteNums  from survey where owner = '${app.globalData.userId}' limit ${skip}  order by createdAt desc`; 
    AV.Query.doCloudQuery(cql).then(function (data) {
        // results 即为查询结果，它是一个 AV.Object 数组
        let results = data.results;
        //let show = true;
        
        currPage.setData({ show:true });
        if(results.length > 0){
          let surveyList = currPage.setSurveyList(results);
          // let surveyList = [];
          
          currPage.setData({surveyList});
        }
        wx.stopPullDownRefresh();
      }, function (error) {
      });
  },
  setSurveyList(data){
      let arr = [];
      for(let i = 0;i<data.length;i++){
        let obj = new Object();
        obj['id'] = data[i].id;
        obj['title'] = data[i].get('title');
        obj['voteNums'] = data[i].get('voteNums');
        arr.push(obj);
      }
      return arr;
  },
  wizardHeadTap(e){
    const idx = e.currentTarget.dataset.idx;
    this.setData({
      currLiActiveIndex:idx
      
    });
  },
  edit(e){
    const surveyId = e.currentTarget.dataset.surveyId;
    wx.navigateTo({
      url: `/pages/edit/index?surveyId=${surveyId}`
    })

  },
  watch(e){
    const surveyId = e.currentTarget.dataset.surveyId;
    wx.navigateTo({
      url: `/pages/result/index?surveyId=${surveyId}`
    })
  },
  del(e){
    let currPage = this;
    wx.showModal({
          title: '提示',
          content: '您确定删除该投票么，删除后无法找回哦！',
          confirmColor:'#5f1971',
          success: function(res) {
            if (res.confirm) {
              currPage.delImgsBySurveyId(e);
            } else if (res.cancel) {
            }
        }
      });
  },
  delSurveyById(e){
    let currPage = this;
    const surveyId = e.currentTarget.dataset.surveyId;
    const cql = `delete from survey where objectId='${surveyId}'`;
    AV.Query.doCloudQuery(cql).then(function(){
      currPage.delAnswersBySurveyId(surveyId);
    });
  },

  delAnswersBySurveyId(surveyId){
    let currPage = this;
    const currLiActiveIndex = this.data.currLiActiveIndex;
    const cql = `select * from answer where surveyId ='${surveyId}'`;
  AV.Query.doCloudQuery(cql).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
      const results = data.results;
      AV.Object.destroyAll(results).then(function () {
    // 成功
        let arr = currPage.data.surveyList;
        arr.splice(currLiActiveIndex,1);
        currPage.setData({
          surveyList:arr
        });
        currPage.init();
      });
      
    });

  },
  delImgsBySurveyId(e){
    let currPage = this;
    const surveyId = e.currentTarget.dataset.surveyId;
    const cql = `select imgIds  from survey where objectId ='${surveyId}'`;
    let imgIds = [];
    AV.Query.doCloudQuery(cql).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
       imgIds = data.results[0]['attributes']['imgIds'];
       for(let i = 0;i<imgIds.length;i++){
          var file = AV.File.createWithoutData(imgIds[i]);
          file.destroy().then(function (success) {
            
          }, function (error) {
          });;
       }
       currPage.delSurveyById(e);
    });
  },
  onPullDownRefresh(){
    // this.setData({page:0});
    this.init();
  },
  /**
	 * 上拉加载获取数据
	 */
  getReachBottomData(){
    let currPage = this;
    let {limit,page} = currPage.data;
    let skip = (page-1)*limit;
    const cql = `select title,voteNums  from survey where owner = '${app.globalData.userId}' limit ${skip},${limit}  order by createdAt desc`; 
    AV.Query.doCloudQuery(cql).then(function (data) {
        // results 即为查询结果，它是一个 AV.Object 数组
        let results = data.results;
        if(results.length > 0){
          let arr = currPage.setSurveyList(results);
          let {surveyList} = currPage.data;
          surveyList = surveyList.concat(arr);
          currPage.setData({surveyList});
          wx.hideLoading();
        }
      }, function (error) {
        wx.hideLoading();
        wx.showToast({
          title: '连接超时',
          duration: 3000,
          icon:'loading',
          mask:true
        })
        console.log('我的调查列表获取失败原因：'+error);
      });
  },
  //默认上拉加载事件
	onReachBottom: function () { 
    let {page,totalPages} = this.data;
    if(page < totalPages){
      wx.showLoading({
        title: '加载中',
        mask:true
      });
      page = page + 1;
      this.setData({page});
      this.getReachBottomData();
    }else{
      if(page==1){ return; }
      this.setData({noMoreDataTxt:"没有更多数据"});
    }
	 },
   openIndex(){
     wx.switchTab({
      url: '/pages/index/index'
     });
   }
})