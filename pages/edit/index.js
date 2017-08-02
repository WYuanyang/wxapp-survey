const {AV,util} = require('../../utils/common.js');
const app = getApp();
Page({
  data: {
   surveyInfo:null,
   inputArr:null,
   uploadImgs:null,
   errTipShow:false,
   errTxt:'',
   inputMin:2,
   inputMax:10,
   reUploadImg:false,
   btnLoad:false,
   btnDisabled:false,
   show:false
  },
  
  onLoad: function (options) {
   this.setData({ surveyId:options.surveyId });
   util.wxlogin(app,this.init);
  },
  init(){
    this.initdefault();
    this.getSurvey();
    this.getAnswers();
  },
  getSurvey(){
    let currPage = this;
    const surveyId = currPage.data.surveyId;
    const cql = `select title,summary,type,open, date1,date2,isAnonymity,imgIds  from survey where objectId ='${surveyId}'`;
    AV.Query.doCloudQuery(cql).then(function (data) {
      const surveyInfo = data.results[0];
      currPage.setData({
        Deadline:surveyInfo.attributes.date1,
        time:surveyInfo.attributes.date2
      });
      currPage.setData({surveyInfo});
      currPage.setUploadImgs();
      
    }, function (error) {

    });
  },

  getAnswers(){
    let currPage = this;
    const surveyId = currPage.data.surveyId;
    const cql = `select objectId, text from answer where surveyId ='${surveyId}' order by sequence asc`;
    AV.Query.doCloudQuery(cql).then(function (data) {
      const inputArr = data.results;
      let arr = new Array();
      for(let i=0;i<inputArr.length;i++){
        let o = new Object();
        o['text'] = inputArr[i].get('text');
        o['sequence'] = inputArr[i].get('sequence');
        o['objectId'] = inputArr[i].get('objectId');
        arr.push(o);
      }
      currPage.setData({inputArr:arr,show:true});
      wx.hideLoading();
      wx.stopPullDownRefresh();
    }, function (error) {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    });
  },

  setUploadImgs(){
    let currPage = this;
    let uploadImgs = [];
    let imgIds = this.data.surveyInfo['attributes']['imgIds'];
    for(let i=0;i<imgIds.length;i++){
      let id = imgIds[i];
      const cql = `select url from _File where objectId ='${id}'`;
      AV.Query.doCloudQuery(cql).then(function (data) {
        const result = data.results[0];
        uploadImgs.push(result['attributes']['url']);
        currPage.setData({uploadImgs});
      });
    }
    
  },

  initdefault(){
    let currDay = new Date();
    let year = currDay.getFullYear();
    let day = util.formatDay(currDay,"-");
    let arr1 = day.split('-');
    //当前年份加99年时间
    year = year + 99 + "-" + arr1[1]+"-"+arr1[2];
    this.setData({
      startDay:day,
      endDay:year,
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
          uploadImgs:tempFilePaths,
          reUploadImg:true
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
    let currPage = this;
    if(arr.length > min){
      let {answerId,idx} = e.currentTarget.dataset;
      if(answerId){
          wx.showModal({
          title: '提示',
          content: '您确定删除该选项么，删除后无法找回哦！',
          confirmColor:'#5f1971',
          success: function(res) {
            if (res.confirm) {
              const cql = `delete from answer where objectId='${answerId}'`;
              AV.Query.doCloudQuery(cql).then(function(){
                arr.splice(idx,1);
                currPage.setData({
                  inputArr:arr
                });
              });
            } else if (res.cancel) {
            }
        }
      });
      }else{
        arr.splice(idx,1);
        currPage.setData({
          inputArr:arr
        });
      }
    }
  },

  addInput(){
    let arr = this.data.inputArr;
    let max = this.data.inputMax;
    if(arr.length < max){
      let newIput = new Object();
      newIput.isNew = true;
      newIput.text = '';
      this.data.inputArr.push(newIput);
      arr = this.data.inputArr;
      this.setData({
        inputArr:arr
      });
    }
  },
  changeAnswer(e){
  
    let inputArr = this.data.inputArr;
    let {idx,isNew} = e.currentTarget.dataset;
    inputArr[idx]['text'] = e.detail.value;
    this.setData({ inputArr });
    
  },
  saveSurvey(e){
    let currPage = this;
    let {title,summary,type,open,isAnonymity,date1,date2} = e.detail.value;
    //获取对应表的名字，如果没有会新建
    const surveyId = currPage.data.surveyId;;
    // 新建投票主题survey对象并存入对应数据
    let survey =  AV.Object.createWithoutData('survey',surveyId);;
    survey.set('title', title);
    survey.set('summary', summary);
    survey.set('type', type);
    survey.set('open', open);
    survey.set('isAnonymity', isAnonymity);
    survey.set('date1', date1);
    survey.set('date2', date2);
    survey.save().
    then(function() {
      
      currPage.delUploadImgs(survey);
      currPage.saveAnswers(e,survey);//存入所有调查主题的选项
      
    }, function(error) {
       
    });
    
  },
  delUploadImgs(survey){
    let currPage = this;
    if(currPage.data.reUploadImg){
        let imgIds = currPage.data.surveyInfo['attributes']['imgIds'];
        for(let i = 0;i<imgIds.length;i++){
          AV.Object.createWithoutData('_File', imgIds[i]).destroy();
        }
        currPage.saveUploadImg(survey);
    }
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
        survey.set('imgIds',imgIds).save();
      });

  },
  //存入所有调查主题的选项
  saveAnswers(e,survey){
   
    let currPage = this;
    let inputArr = currPage.data.inputArr;
    let answer = null;
    for(let i = 0;i<inputArr.length;i++){
      //所有调查主题的选项
      answer = AV.Object.createWithoutData('answer', inputArr[i].objectId);
      answer.set('text', e.detail.value[`answer${i}`]);
      answer.set('sequence', i);//选项的位置，是第几个选项
      answer.set('surveyId', survey.id);
      answer.save();
    }
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
  formSubmit(e){
    if(this.checkIsNull(e)){
      util.setBtnLoading(this);
      this.saveSurvey(e);
    }
  },
  onPullDownRefresh(){
    this.init();
  }
})
