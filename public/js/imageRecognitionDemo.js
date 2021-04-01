var ini;

axios.get( "./conf/imageRecognitionIni.json" )
.then(
	( res ) => { start( res ); },				// 加载配置文件成功
	( err ) => { startFail( err.request ); }	// 加载配置文件失败
);

function start( a_ini ){
	ini = a_ini.data;
	var _picFile;			// 图片文件对象
	var app = new Vue({		// 使用 Vue 引擎
		el:"#app",			// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			selectedImgSrc:"",
			picNameLabelColor:"color: #00ffff;",
			selectedImgName:"- No image were seleted -",
			picSizeLimit:1024,
			picOrgWidth:1,
			picOrgHeight:1,
			picScale:1,
			picCrtWidth:1,
			picCrtHeight:1,
			parseRtn: {},
			parseRes:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
							<span class="objectID">id:</span> <span class="objectValue">17</span><br/><span class="objectID">P:</span> <span class="objectValue">95.2%</span>\
						</span>'
		},
		methods:{
			selectImage:function( e ){	// 选择本地图片并加载预览
				_picFile = e.target.files[0];
				if (!_picFile) return;
				var reader = new FileReader();
				reader.onload = () => {	//reader.onload = (evt)=>{	//此处evt可省略，因为 evt.result 即 reader;  todo? 此处用 function 替代 => 无法正确执行？？？可能是因为 this 指向问题，在箭头函数中，this指向正确的vue对象
					this.selectedImgName = _picFile.name;
					var _imgOrg = new Image();		// 记录图片原始尺寸
					_imgOrg.onload = () => {		// 图片加载完毕事件
						// TODO: 判断是否超过了尺寸限制	// console.log( _imgOrg.width, _imgOrg.height );
						this.picOrgWidth = _imgOrg.width;
						this.picOrgHeight = _imgOrg.height;
						
						var _img = this.$refs.imagePre;
						_img.onload = () => {		// 图片加载完毕事件
							this.picCrtWidth = _img.width;
							this.picCrtHeight = _img.height;
							this.picScale = this.picCrtWidth / this.picOrgWidth;
							{
								// // 测试画框代码
								// console.log( _img.width, _img.height, this.picScale );
								// var testData = {
								// 	"filename":"dog.jpg",
								// 	"objects":[
								// 		{"class_id":58,"confidence":32.5,"name":"people-face","relative_coordinates":{"center_x":0.130001,"center_y":0.682989,"width":0.140001,"height":0.180412}},
								// 		{"class_id":16,"confidence":97.9,"name":"dog","relative_coordinates":{"center_x":0.430001,"center_y":0.634021,"width":0.300001,"height":0.340206}},
								// 		{"class_id":1,"confidence":92.3,"name":"bicycle","relative_coordinates":{"center_x":0.960001,"center_y":0.335051,"width":0.080001,"height":0.283505}}
								// 	],
								// 	"frame_id":1
								// };
								// for ( var i = 0; i < testData["objects"].length; i ++ )
								// {
								// 	testData["objects"][ i ]["relative_coordinates"]["b_x"] = testData["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( testData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 );
								// 	testData["objects"][ i ]["relative_coordinates"]["b_y"] = testData["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( testData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 );
								// 	testData["objects"][ i ]["relative_coordinates"]["b_width"] = testData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
								// 	testData["objects"][ i ]["relative_coordinates"]["b_height"] = testData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
								// }
								// this.parseRtn = testData;
							}
						}
						this.selectedImgSrc = reader.result;	// 加载预览图片, 加载完成时触发 onload 事件
					}
					_imgOrg.src = reader.result;		// 加载原尺寸图片, 加载完成时触发 onload 事件
				}
				reader.readAsDataURL( _picFile );	// 读取本地图片数据，可用于form上传
			},
			uploadImage:function(){		// 上传图片
				if ( this.selectedImgSrc == "" ) return;
				var formData = new FormData();
				formData.append( 'file', _picFile );
				axios.post( ini["imgRecognitionSvrUrl"], formData ).then(
					( res ) => {		// console.log( res.status ); console.log( res.data );
						if ( res.data["objects"].length < 1 ) {
							// alert( "Nothing was identified !" );
							this.$refs.alertMsg.style.display = "block";
							return;
						} else this.$refs.alertMsg.style.display = "none";
						for ( var i = 0; i < res.data["objects"].length; i ++ )
						{
							res.data["objects"][ i ]["relative_coordinates"]["b_x"] = res.data["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( res.data["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 );
							res.data["objects"][ i ]["relative_coordinates"]["b_y"] = res.data["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( res.data["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 );
							res.data["objects"][ i ]["relative_coordinates"]["b_width"] = res.data["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
							res.data["objects"][ i ]["relative_coordinates"]["b_height"] = res.data["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
						}
						this.parseRtn = res.data;
					},
					( err ) => {		// 注：使用箭头函数可以避免 this 指向转移的问题，如果不使用箭头函数，则 this 需要事先保存到如 that 的变量中
						console.log( err.request.status, err.request.statusText )
					}
				);
			},
			// btnMouseOver:function( e ){ e.target.className="nes-btn is-primary"; },		// 鼠标在按钮上移入
			// btnMouseLeave:function( e ){ e.target.className="nes-btn"; },				// 鼠标在按钮上移出
			clickImage:function(){ this.$refs.btnSelPic.dispatchEvent(new MouseEvent('click')); }
		}
	});
}

function toPercent( num, point = 0 ){	// 小数转百分比函数
	if ( typeof( num ) != "number" ) return 0;
	if ( typeof( point ) != "number" ) return 0;
	return Number( num * 100 ).toFixed( point );
}

function startFail( a_err ){
	var app = new Vue({		// 使用 Vue 引擎
		el:"#app",			// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			selectedImgSrc:"",
			picNameLabelColor:"color: #ff0000;",
			selectedImgName:"Load Ini File Failed :-(",
		},
	});
}