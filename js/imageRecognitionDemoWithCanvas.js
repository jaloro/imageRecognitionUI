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
			praseRtn: {},
			parseRes:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
							<span class="objectID">id:</span> <span class="objectValue">17</span><br/><span class="objectID">P:</span> <span class="objectValue">95.2%</span>\
						</span>'
		},
		methods:{
			selectImage:function( e ){	// 选择本地图片并加载预览
				// 判断 canvas 是否兼容有效
				var _canvas = this.$refs.canvasPic;
				if ( _canvas.getContext ){
					var _content = _canvas.getContext("2d");
				} else {
					return;
				}
				_picFile = e.target.files[0];
				if (!_picFile) return;
				var reader = new FileReader();
				reader.onload = () => {	//reader.onload = (e)=>{	//此处e可省略，因为 e.result 即 reader;  todo? 此处用 function 替代 => 无法正确执行？？？可能是因为 this 指向问题，在箭头函数中，this指向正确的vue对象
					this.selectedImgSrc = reader.result;	// 等同于使用 e 参数时的： e.target.result;
					this.selectedImgName = _picFile.name;
					var _img = new Image();
					_img.onload = () => {		// 图片加载完毕事件
						// TODO: 判断是否超过了尺寸限制	// console.log( _img.width, _img.height );
						this.picOrgWidth = _img.width;
						this.picOrgHeight = _img.height;
						if ( this.picOrgWidth > this.picOrgHeight ){	// 横向图
							if ( this.picOrgWidth > 500 ){
								_img.height = this.picOrgHeight / this.picOrgWidth * 500;
								_img.width = 500;
							}
						} else {	// 纵向图
							if ( this.picOrgHeight > 500 ){
								_img.width = this.picOrgWidth / this.picOrgHeight * 500;
								_img.height = 500;
							}
						}
						this.picCrtWidth = _img.width;
						this.picCrtHeight = _img.height;
						this.picScale = _img.width / this.picOrgWidth;
						_canvas.height = _canvas.height;	// 清空canvas
						_content.drawImage( _img, (500-_img.width)*0.5, (500-_img.height)*0.5, _img.width, _img.height);
						{
						// 	// 测试画框代码
						// 	var testData = {
						// 		"filename":"dog.jpg",
						// 		"objects":[
						// 			{"class_id":58,"confidence":32.5,"name":"people-face","relative_coordinates":{"center_x":0.130001,"center_y":0.682989,"width":0.140001,"height":0.180412}},
						// 			{"class_id":16,"confidence":97.9,"name":"dog","relative_coordinates":{"center_x":0.430001,"center_y":0.634021,"width":0.300001,"height":0.340206}},
						// 			{"class_id":1,"confidence":92.3,"name":"bicycle","relative_coordinates":{"center_x":0.960001,"center_y":0.335051,"width":0.080001,"height":0.283505}}
						// 		],
						// 		"frame_id":1
						// 	};
						// 	for ( var i = 0; i < testData["objects"].length; i ++ )
						// 	{
						// 		testData["objects"][ i ]["relative_coordinates"]["b_x"] = testData["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( testData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 );
						// 		testData["objects"][ i ]["relative_coordinates"]["b_y"] = testData["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( testData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 );
						// 		testData["objects"][ i ]["relative_coordinates"]["b_width"] = testData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
						// 		testData["objects"][ i ]["relative_coordinates"]["b_height"] = testData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
						// 	}
						// 	this.praseRtn = testData;
						}
					}
					_img.src = this.selectedImgSrc;		// 加载图片, 加载完成时触发 onload 事件
				}
				reader.readAsDataURL( _picFile );		// 读取本地图片数据，用于 FormData 上传
			},
			uploadImage:function(){		// 上传图片
				if ( this.selectedImgSrc == "" ) return;
				var formData = new FormData();
				formData.append( 'file', _picFile );
				axios.post( ini["imgRecognitionSvrUrl"], formData ).then(
					( res ) => {		// console.log( res.status ); console.log( res.data );
						if ( res.data["objects"].length < 1 ) {
							// alert( "Nothing was identified" );
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
						this.praseRtn = res.data;
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