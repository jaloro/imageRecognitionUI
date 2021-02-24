var ini;

// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
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
			parse_Res:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
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
						this.praseRtn = {};
						this.$refs.waitingBox.style.display = "none";
						// this.parseRes();	// 测试画框代码
					}
					_img.src = this.selectedImgSrc;		// 加载图片, 加载完成时触发 onload 事件
				}
				this.$refs.waitingBox.style.display = "block";
				reader.readAsDataURL( _picFile );		// 读取本地图片数据，用于 FormData 上传
			},
			uploadImage:function(){		// 上传图片
				if ( this.selectedImgSrc == "" ) return;
				var formData = new FormData();
				formData.append( 'file', _picFile );
				// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
				this.$refs.waitingBox.style.display = "block";
				axios.post( ini["imgRecognitionSvrUrl"], formData ).then(
					( res ) => {		// console.log( res.status ); console.log( res.data );
						// console.log( "上传图片结果：" );
						// console.log( res.data );
						this.parseRes( res.data );		// 调用画框处理函数
					},
					( err ) => {		// 注：使用箭头函数可以避免 this 指向转移的问题，如果不使用箭头函数，则 this 需要事先保存到如 that 的变量中
						this.$refs.waitingBox.style.display = "none";
						console.log( 'Post Image Error:', err.request.status, '| Status Text:' + err.request.statusText );
						alert( err.request.status + ' - ' + err.request.statusText );
					}
				);
				
			},
			parseRes:function( a_resData = null ){		// 解析返回值
				if ( !a_resData ) {
					a_resData = {
						"filename":"dog.jpg",
						"objects":[
							{"class_id":58,"confidence":32.5,"name":"people-face","relative_coordinates":{"center_x":0.130001,"center_y":0.682989,"width":0.140001,"height":0.180412}},
							{"class_id":16,"confidence":97.9,"name":"dog","relative_coordinates":{"center_x":0.430001,"center_y":0.634021,"width":0.300001,"height":0.340206}},
							{"class_id":1,"confidence":92.3,"name":"bicycle","relative_coordinates":{"center_x":0.960001,"center_y":0.335051,"width":0.080001,"height":0.283505}}
						],
						"frame_id":1
					};
				}
				if ( a_resData["objects"].length < 1 ) {
					// alert( "Nothing was identified" );
					this.$refs.alertMsg.style.display = "block";
					this.$refs.waitingBox.style.display = "none";
					return;
				} else this.$refs.alertMsg.style.display = "none";
				for ( var i = 0; i < a_resData["objects"].length; i ++ )
				{
					a_resData["objects"][ i ]["relative_coordinates"]["b_x"] = a_resData["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 ) + ( 500 - this.picCrtWidth ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates"]["b_y"] = a_resData["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 ) + ( 500 - this.picCrtHeight ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates"]["b_width"] = a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
					a_resData["objects"][ i ]["relative_coordinates"]["b_height"] = a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
				}
				this.praseRtn = a_resData;
				this.$refs.waitingBox.style.display = "none";
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

// 加载配置文件失败时的处理代码
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

/*
formProxy.append( 'photo', readStream );			// 添加一个文件型参数到 formData 对象中
		// formProxy.append( 'firstName', 'Marcin' );		// 添加其他值对参数到 formData 对象中
		let _query = stringify( req.query );
		const reqProxy = http.request(						// import { request } from 'http';	// 创建一个 'http.request' 对象
			{
				host: proxyHost,
				port: proxyPort,
				path: proxyRoute + ( _query == '' ? '' : ( "?" + _query ) ),
				method: 'POST',
				headers: formProxy.getHeaders(),
			},
			// response
			( response ) => {
				// console.log( response.statusCode ); // 200
				reply.send( response );
			}
		);
		formProxy.pipe( reqProxy );
*/
				// js Post 示例
				// var formData = new FormData();
				// formData.append( 'file', _picFile );
				// const httpRequest = new XMLHttpRequest()
				// // 获取数据后的处理程序
				// // httpRequest.onreadystatechange = function () {//请求后的回调接口，可将请求成功后要执行的程序写在其中
				// // 	if (httpRequest.readyState == 4 && httpRequest.status == 200) {//验证请求是否发送成功
				// // 		var json = httpRequest.responseText;//获取到服务端返回的数据
				// // 		console.log(json);
				// // 	}
				// // };
				// httpRequest.onreadystatechange = function(){
				// 	if ( httpRequest.readyState === 4) {
				// 		const response  = JSON.parse(httpRequest.responseText)
				// 		if ( response.code === '200' ) {
				// 			console.log('success')
				// 		} else {
				// 			console.log('fail')
				// 		}
				// 	}
				// }
				// httpRequest.open('post', ini["imgRecognitionSvrUrl"], true)
				// httpRequest.send(formData)