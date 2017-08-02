const {AV,util} = require('../../utils/common.js');
const app = getApp();
Page({
  data:{
    surveyInfo:null,
    answerList:null,
    totalVotes:0,
    percentArr:null,
    uploadImgs:null,
    errTipShow:false,
    errTxt:'',
    // btnTxt:'',
    hasSubmit:null,
    btnLoad:false,
    btnDisabled:false,
    isEnd:false,
    showAvatarNums:5,
    // pageShow:app.globalData.pageShow
  },
  onLoad:function(options){
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({ 
      surveyId:options.surveyId 
      //surveyId:"5933d608a0bb9f0058d9003a"
      });
    util.wxlogin(app,this.init);
  },
  onReady:function(){
    // 页面渲染完成
    // this.init();
  },
  onShow:function(){
    // 页面显示
   
  },
  onHide:function(){
    // 页面隐藏
  },
  onUnload:function(){
    // 页面关闭
  },
  init(){
    this.getSurvey();
  },
  getSurvey(){
    let currPage = this;
    // const surveyId = currPage.data.surveyId;
    let {surveyId} = currPage.data;
    if(surveyId){
      const cql = `select title,summary,type,isAnonymity,imgIds,date1,date2  from survey where objectId ='${surveyId}'`;
    AV.Query.doCloudQuery(cql).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
      const surveyInfo = data.results[0];
      currPage.setData({surveyInfo});
      currPage.compareTime();
      currPage.watchIsDateEnd();
      currPage.setUploadImgs();
      currPage.getAnswers();
      
    }, function (error) {

    });
    }
    
  },
  //判断投票是否到了截止日期
  compareTime(){
    let attr = this.data.surveyInfo;
    if (attr!=null){
      let { date1, date2 } = attr['attributes'];
      let endDay = date1 + " " + date2;
      let today = new Date();
      today = util.formatDay(today, '-') + ' ' + util.formatTime(today, ':');
      if (today >= endDay) {
        this.setData({ isEnd: true, btnDisabled: true });
      }
    }
    
  },
  //监听该投票是否到期
  watchIsDateEnd(){
    let currPage = this;
    let isEnd = currPage.data.isEnd;
    if(!isEnd){
      let si = setInterval(()=>{
        let isEnd = currPage.data.isEnd;
        currPage.compareTime();
        if(isEnd){
          clearInterval(si);
        }
      },1000);
    }
  },
  //获取所有投票的选项列表
  getAnswers(){
    let currPage = this;
    let {surveyId} = currPage.data;
    let isAnonymity = currPage.data.surveyInfo.get('isAnonymity');
    const cql = `select text,voteUsers from answer where surveyId ='${surveyId}' order by sequence asc`;
    AV.Query.doCloudQuery(cql).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
      const answerList = data.results;
      currPage.setData({answerList});
      currPage.setHasSubmit(answerList);
      currPage.getTotalVotes(answerList);
      currPage.setPercentArr(answerList);
      //如果是匿名投票将不显示投票者信息
      if(!isAnonymity){
         currPage.setAvatarList(answerList);
         currPage.setHideAvatarList(answerList);
      }
      wx.hideLoading();
      wx.stopPullDownRefresh();
      currPage.setData({ show:true });
    }, function (error) {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    });
  },
  //判断该用户是否已经提交过
  setHasSubmit(answerList){
    let arr = new Array();
    let userId = app.globalData.userId;
    for(let i = 0;i<answerList.length;i++){
      let voteUsers = answerList[i]['attributes']['voteUsers'];
      if (voteUsers.indexOf(userId)>=0) {
        this.setData({
          hasSubmit:true
        });
        break;
      }
    }
    
  },
  updateVoteNums(nums){
    let currPage = this;
    const surveyId = currPage.data.surveyId;
    let survey = AV.Object.createWithoutData('survey', surveyId);
    survey.set('voteNums', nums).save();
  },

  getTotalVotes(arr){
    let totalVotes = 0;
    let percent = 0.0;
    for(let i = 0;i<arr.length;i++){
        let voteUsers = arr[i]['attributes']['voteUsers'];
		    totalVotes += voteUsers.length;
	  }
    this.setData({totalVotes});
    this.updateVoteNums(totalVotes);
  },
  setPercentArr(answerList){
    let totalVotes = this.data.totalVotes;
    let percent = '0.0';
    let percentArr = [];
    for(let i = 0;i<answerList.length;i++){
        let num = answerList[i]['attributes']['voteUsers'].length;
        if(totalVotes<=0){
          percent = percent;
        }else{
          percent = ((num/totalVotes)*100).toFixed(1);
        }
		    percentArr.push(percent);
	  }
    this.setData({percentArr});
  },
  setHideAvatarList(answerList){
    let hideAvatarList = new Array();
    for(let i = 0;i<answerList.length;i++){
      hideAvatarList.push(false);
    }
    this.setData({hideAvatarList});
  },
  setUploadImgs(){
    let currPage = this;
    let uploadImgs = [];
    let imgIds = this.data.surveyInfo['attributes']['imgIds'];
    let objects = new Array();
    for(let i=0;i<imgIds.length;i++){
      let file = AV.Object.createWithoutData('_File', imgIds[i]);;
      objects.push(file);
    }
    AV.Object.fetchAll(objects).then(function (objects) {
      for(let i=0;i<objects.length;i++){
        uploadImgs.push(objects[i].get('url'));
      }
      currPage.setData({uploadImgs});
    });
  },

  showAvatar(e){
    let idx = e.currentTarget.dataset.idx;
    let {hideAvatarList} = this.data;
    hideAvatarList[idx] = !hideAvatarList[idx];
    this.setData({hideAvatarList})
  },
  setAvatarList(answerList){
    let currPage = this;
    let showAvatarNums = this.data.showAvatarNums;
    let arrList = new Array();//存放所有选项前五名的userId
    let numsArr = new Array();//存放每个选项显示userAvatar的个数
    for(let i=0;i<answerList.length;i++){
      let arr = answerList[i]['attributes']['voteUsers'].slice(-showAvatarNums);
      numsArr.push(arr.length);
      arrList = arrList.concat(arr);
      // 生成一个Promise对象的数组
      // let promises = arr.map(function (id) {
      //   // let user = AV.Object.createWithoutData('_User',id);
      //   return new AV.Query('_User').get(id);
      // });
      // Promise.all(promises).then(function (data) {
      //   avatarUrls[i] = data.reverse();
      //   // avatarUrls = avatarUrls.reverse();
      //   currPage.setData({avatarUrls});
      // }).catch(function(reason){
      //   // ...
      // });
    }
    let objects = new Array();
    for(let i = 0;i<arrList.length;i++){
      let user = AV.Object.createWithoutData('_User',arrList[i]);
      objects.push(user);
    }
    AV.Object.fetchAll(objects).then(function (objects) {
         let users = currPage.getUsersList(objects);
         let avatarUrls = currPage.categoryUsers(users,numsArr);
         currPage.setData({avatarUrls});
    });
  },
 getUsersList(objects){
    let arr = new Array();
    for(let  i = 0;i<objects.length;i++){
      let obj = new Object();
      obj.avatarUrl = objects[i].get('avatarUrl');
      obj.nickName = objects[i].get('nickName');
      arr.push(obj);
    }
    return arr;
 },
  
  //将所有取出的要显示的user重新编排，比如[[id1,id2],[],[id4,id7]]
  categoryUsers(objects,numsArr){
    let avatarUrls = new Array();
    let sum = 0;
    for(let i = 0;i<numsArr.length;i++){
      avatarUrls[i] = objects.slice(sum,sum+numsArr[i]).reverse();
      sum+=numsArr[i];
      
    }
    return avatarUrls;
  },
  previewImage(e){
    let uploadImgs = this.data.uploadImgs;
    let idx = e.currentTarget.dataset.idx;
    wx.previewImage({
      current: uploadImgs[idx], // 当前显示图片的http链接
      urls: uploadImgs // 需要预览的图片http链接列表
    })
  },
  check(e){
    console.log("hasSubmit==="+this.data.hasSubmit);
    let flag = true;
    const values = e.detail.value;
    if(this.data.hasSubmit){
      this.showError('您已经投过了，请勿重复提交!❤️');
      flag = false;
      return;
    }
    if(values.answerId.length<=0){
      this.showError('请勾选一项进行投票！❤️');
      flag = false;
      return;
    }
    
    return flag;
  },
  radioSubmit(e){
      let currPage = this;
      let answerId = e.detail.value.answerId;
      const cql1 = `select voteUsers from answer where objectId ='${answerId}'`;
      let voteUsers = new Array();
      AV.Query.doCloudQuery(cql1).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
        const result = data.results[0];
        let userId = app.globalData.userId;
         voteUsers = result['attributes']['voteUsers'];
         voteUsers.push(userId);
      }).then(function(){
        let answer = AV.Object.createWithoutData('answer', answerId);
        // 修改属性
        answer.set('voteUsers', voteUsers);
        // 保存到云端
        answer.save().then(()=>{
          currPage.saveParticipant();
          currPage.getAnswers();
        });
      });
  },
  checkboxSubmit(e){
     let currPage = this;
     let answerIds = e.detail.value.answerId;
     let userId = app.globalData.userId;
     for(let i =0;i<answerIds.length;i++){
      const cql1 = `select voteUsers from answer where objectId ='${answerIds[i]}'`;
      let voteUsers = new Array();
      AV.Query.doCloudQuery(cql1).then(function (data) {
      // results 即为查询结果，它是一个 AV.Object 数组
        const result = data.results[0];
         voteUsers = result['attributes']['voteUsers'];
         voteUsers.push(userId);
      }).then(function(){
        let answer = AV.Object.createWithoutData('answer', answerIds[i]);
        // 修改属性
        answer.set('voteUsers', voteUsers);
        // 保存到云端
        answer.save().then(()=>{
          currPage.getAnswers();
        });
      });
     }
     currPage.saveParticipant();
  },
  saveParticipant(){
    let surveyId = this.data.surveyId;
    let userId = app.globalData.userId;
    // let open = this.data.surveyInfo.get('open');
    let participant = new AV.Object('participant');
    let survey = AV.Object.createWithoutData('survey', surveyId);
    let _User = AV.Object.createWithoutData('_User', userId);
    // 添加属性
    participant.set('surveyId', survey);
    participant.set('userId', _User);
    // participant.set('open', true);
    // 保存到云端
    participant.save();
  },
  formSubmit(e){
    let type = this.data.surveyInfo['attributes']['type'];
    let hasSubmit = this.data.hasSubmit;
    if(this.check(e)){
      util.setBtnLoading(this);
      switch(type){
        case '0':
          this.radioSubmit(e);
          break;
        case '1':
          this.checkboxSubmit(e);
          break;
        default:
          break;
      }
      
    }
    
  },
  openIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },
  showError(str){
    this.setData({
      errTipShow : true,
      errTxt:str
    });
    let st = setTimeout(()=>{
      this.setData({
       errTipShow:false,
      });
      clearTimeout(st);
    },2000);
  },
  onShareAppMessage() {
    // let currPage = this;
    let nickName = app.globalData.userInfo.nickName;
    // const surveyId = currPage.data.surveyId;
    
    let title = `🔴${nickName}给您发来了一个投票`;
    // console.log(surveyId);
    return {
      title: title,
      // path: `/page/result?id=${surveyId}`,
      success: function(res) {
        // 分享成功
      },
      fail: function(res) {
        // 分享失败
      }
    }
  },
  onPullDownRefresh(){
    this.init();
  }
})