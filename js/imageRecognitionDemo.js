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
			picWidth:0,
			picHeight:0,
			picScale:1,
			praseRtn: {
				"filename":"dog.jpg",
				"objects":[
					{"class_id":7,"confidence":92.3,"name":"truck","relative_coordinates":{"x":0,"y":160,"width":380,"height":283}},
					{"class_id":58,"confidence":32.5,"name":"people-face","relative_coordinates":{"x":30,"y":230,"width":70,"height":70}},
					{"class_id":16,"confidence":97.9,"name":"dog","relative_coordinates":{"x":140,"y":180,"width":150,"height":132}},
					{"class_id":1,"confidence":92.3,"name":"bicycle","relative_coordinates":{"x":460,"y":75,"width":40,"height":110}}
				],
				"frame_id":1
			},
			parseRes:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
							<span class="objectID">id:</span> <span class="objectValue">17</span><br/><span class="objectID">P:</span> <span class="objectValue">95.2%</span>\
						</span>'
		},
		methods:{
			selectImage:function( e ){	// 选择本地图片并加载预览
				_picFile = e.target.files[0];
				if (!_picFile) return;
				// TODO: 判断 canvas 是否兼容有效
				/*
				var _canvas = this.$refs.canvasPic;
				if ( _canvas.getContext ){
					var _content = _canvas.getContext("2d");
				}
				*/
				var reader = new FileReader();
				reader.onload = () => {	//reader.onload = (evt)=>{	//此处evt可省略，因为 evt.result 即 reader;  todo? 此处用 function 替代 => 无法正确执行？？？可能是因为 this 指向问题，在箭头函数中，this指向正确的vue对象
					this.selectedImgSrc = reader.result;
					this.selectedImgName = _picFile.name;
					var _canvas = this.$refs.canvasPic;
					var _content = _canvas.getContext("2d");
					var _img = new Image();
					_img.onload = () => {		// 图片加载完毕事件
						// console.log( _img.width, _img.height );
						// TODO: 判断是否超过了尺寸限制
						this.picWidth = _img.width;
						this.picHeight = _img.height;
						if ( this.picWidth > this.picHeight ){	// 横向图
							if ( this.picWidth > 500 ){
								_img.height = this.picHeight / this.picWidth * 500;
								_img.width = 500;
							}
						} else {	// 纵向图
							if ( this.picHeight > 500 ){
								_img.width = this.picWidth / this.picHeight * 500;
								_img.height = 500;
							}
						}
						this.picScale = _img.width / this.picWidth;
						console.log("图片缩放比: " + this.picScale);
						_canvas.height = _canvas.height;	// 清空canvas
						_content.drawImage( _img, (500-_img.width)*0.5, (500-_img.height)*0.5, _img.width, _img.height);
					}
					_img.src = reader.result;		// 开始加载图片,等同于 e.target.result; 加载结束时触发绘制图像到canvas上的代码
				}
				reader.readAsDataURL( _picFile );	// 读取本地图片数据，可用于form上传
			},
			uploadImage:function(){		// 上传图片
				if ( this.selectedImgSrc == "" ) return;
				var formData = new FormData();
				formData.append( 'file', _picFile );
				axios.post( ini["imgRecognitionSvrUrl"], formData ).then(
					( res ) => {	//console.log( res.status ); console.log( res.data );
						// res.data["object"][0]["relative_coordinates"]["center_x"]
						console.log( res.data );
						this.praseRtn = {};
					},
					( err ) => {	// 注：使用箭头函数可以避免 this 指向转移的问题，如果不使用箭头函数，则 this 需要事先保存到如 that 的变量中
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

function toPercent( num, point ){	// 小数转百分比函数
	if (point==0) { return "0%"; }
	return Number( num * 100 ).toFixed( point ) + "%";
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