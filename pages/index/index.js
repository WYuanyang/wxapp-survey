const {AV,util} = require('../../utils/common.js');
const app = getApp();
Page({
  data: {
    Deadline:'',
    startDay:'',
    endDay:'',
    inputArr:[{},{}],
    time:'',
    uploadImgs:[],
    inputMin:2,
    inputMax:10,
    errTipShow:false,
    errTxt:'',
    btnLoad:false,
    btnDisabled:false
  },
  
  onLoad: function () {
    util.wxlogin(app,this.initdefault);
  },
  onShow: function(){
    
  },
  initdefault(){
    let currDay = new Date();
    let year = currDay.getFullYear();
    let day = util.formatDay(currDay,"-");
    let time = util.formatTime(currDay,":");
    let arr1 = day.split('-');
    year = year + 99 + "-" + arr1[1]+"-"+arr1[2];
    this.setData({
      Deadline:day,
      startDay:day,
      endDay:year,
      time:time,
      show:true,
      userId:app.globalData.userId
    });
  },
  bindDateChange(e){
    this.setData({
      Deadline:e.detail.value
      
    });
  },
  bindTimeChange(e){
    this.setData({
      time:e.detail.value
    });
  },
  chooseImage(){
    wx.chooseImage({
      count: 3, // 默认9
      sizeType: ['original', 'compressed'], 
      sourceType: ['album'], 
      success:res =>{
        let tempFilePaths = res.tempFilePaths;
        this.setData({
          uploadImgs:tempFilePaths
        });
      }
    })
  },
  previewImage(e){
    let imgs = this.data.uploadImgs;
    let idx = e.currentTarget.dataset.idx;
    wx.previewImage({
      current: imgs[idx], // 当前显示图片的http链接
      urls: imgs // 需要预览的图片http链接列表
    })
  },
  delInput(e){
    let arr = this.data.inputArr;
    let min = this.data.inputMin;
    if(arr.length > min){
      let idx = e.currentTarget.dataset.idx;
      arr.splice(idx,1);
      this.setData({
        inputArr:arr
      });
    }
    
  },
  addInput(){
    let arr = this.data.inputArr;
    let max = this.data.inputMax;
    if(arr.length < max){
      let newIput = {};
      this.data.inputArr.push(newIput);
      arr = this.data.inputArr;
      this.setData({
        inputArr:arr
      });
    }
  },
  formSubmit(e){
    console.log(e.detail.value);
    if(this.checkIsNull(e)){
      util.setBtnLoading(this);
      this.saveSurvey(e);
    }
    
    
  },
  saveSurvey(e){
    let currPage = this;
    let { title, summary, type,open,isAnonymity,date1,date2} = e.detail.value;
    //获取对应表的名字，如果没有会新建
    let Survey = AV.Object.extend('survey');
    // 新建投票主题survey对象并存入对应数据
    let survey = new Survey();
    survey.set('title', title);
    survey.set('summary', summary);
    survey.set('type', type);
    survey.set('open', open);
    survey.set('isAnonymity', isAnonymity);
    survey.set('date1', date1);
    survey.set('date2', date2);
    survey.set('owner', app.globalData.userId);
    survey.set('voteNums', 0);//初始投票人数为0
    survey.save().
    then(function() {
      currPage.saveUploadImg(survey);//存入上传的图片
      
    }, function(error) {
    }).then(function(){
      currPage.saveAnswers(e,survey);//存入所有调查主题的选项
    });;
    
  },
  //存入上传的图片
  saveUploadImg(survey){
      let imgs = this.data.uploadImgs;
      let imgIds = [];
      let objs = [];
      for(let i = 0;i<imgs.length;i++){
        let file = new AV.File('uploadImg'+i, {
          blob: {
            uri: imgs[i]
          },
        });
        objs.push(file);
      }
      AV.Object.saveAll(objs).then(function(results){
        for(let i = 0;i<results.length;i++){
          imgIds.push(results[i].id);
        }
        if (imgIds)
        survey.set('imgIds',imgIds).save();
      });

  },
  //存入所有调查主题的选项
  saveAnswers(e,survey){
    let currPage = this;
    let inputArr = this.data.inputArr;
    let Answer = AV.Object.extend('answer');
    let objects = [];
    for(let i = 0;i<inputArr.length;i++){
      //所有调查主题的选项
      let answer = new Answer();
      answer.set('text', e.detail.value[`answer${i}`]);
      answer.set('sequence', i);//选项的位置，是第几个选项
      answer.set('surveyId', survey.id);
      objects.push(answer);
    }
     AV.Object.saveAll(objects);
  },
  checkIsNull(e){
    let flag = true;
    let values = e.detail.value;
    if(values.title===''){
      this.showError("投票标题不能为空！❤️");
      return flag=false;
    }
    let inputArr = this.data.inputArr;
    for(let i = 0; i<inputArr.length;i++){
      if(values[`answer${i}`]===''){
        this.showError(`第${i+1}个选项描述为空，请补充！❤️`);
        return flag=false;
      }
    }

    if(values.type===''){
      this.showError("请选择投票类型！❤️");
      return flag=false;
    }
    return flag;
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
    let nickName = app.globalData.userInfo.nickName;
    let title = `🔴${nickName}请您创建投票`;
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
  }
})
