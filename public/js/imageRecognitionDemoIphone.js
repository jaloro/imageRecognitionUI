var ini;
var $_GET = getGetArgs();

// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.get( "./conf/imageRecognitionIni.json" )
.then(
	( res ) => { start( res ); },							// 加载配置文件成功
	( err ) => { startFail( err.request ); }				// 加载配置文件失败
);

function start( a_ini ){
	ini = a_ini.data;
	let maxSideLength = ini[ "maxSideLength" ];				// 图像上传最大边长尺寸
	var _picFile;						// 图片文件对象
	let _canvas;						// 图像显示画布
	let _content;
	let _canvasUpload;					// 图像上传画布
	let _contentUpload;
	var app = new Vue({					// 使用 Vue 引擎
		el:"#app",						// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			selectedImgSrc:"",
			picNameLabelColor:"font-size: 70%; color: #00ffff;",
			selectedImgName:"- No image were seleted -",
			dataModelCategary: { selectedItem:-1, items:[ "demo", "crawfish" ] },
			dataModelCategrayName: "demo",		// 数据模型库名称
			picOrgWidth:1,				// 图像原始宽度
			picOrgHeight:1,				// 图像原始高度
			picScale:1,
			picCrtWidth:1,				// 用于绘制识别对象框的宽度
			picCrtHeight:1,				// 用于绘制识别对象框的高度
			praseRtn: {},
			parse_Res:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
							<span class="objectID">id:</span> <span class="objectValue">17</span><br/><span class="objectID">P:</span> <span class="objectValue">95.2%</span>\
						</span>'
		},
		methods:{
			selectImage:function( e ){	// 选择本地图片并加载预览
				// 判断 canvas 是否兼容有效
				_canvas = this.$refs.canvasPic;				// 建立显示画布 --------------
				if ( _canvas.getContext ) _content = _canvas.getContext("2d");
				else return;
				_canvasUpload = this.$refs.canvasUpload;	// 建立上传画布 --------------
				if ( _canvasUpload.getContext ) _contentUpload = _canvasUpload.getContext("2d");
				else return;
				_picFile = e.target.files[ 0 ];
				if ( !_picFile ) return;
				this.$refs.waitingBox.style.display = "block";
				this.$refs.alertMsg.style.display = "none";
				var reader = new FileReader();
				reader.onload = () => {	//reader.onload = (e)=>{				//此处e可省略，因为 e.result 即 reader;  todo? 此处用 function 替代 => 无法正确执行？？？可能是因为 this 指向问题，在箭头函数中，this指向正确的vue对象
					this.selectedImgSrc = reader.result;						// 等同于使用 e 参数时的： e.target.result;
					this.selectedImgName = _picFile.name;
					var _img = new Image();
					// var _img = this.$refs.imagePre;
					_img.onload = () => {					// 图片加载完毕事件
						// TODO: 判断是否超过了尺寸限制		// console.log( _img.width, _img.height );
						let _showWidth = 1;
						let _showHeight = 1;
						let _uploadWidth = 1;
						let _uploadHeight = 1;
						this.picOrgWidth = _showWidth = _uploadWidth = _img.width;
						this.picOrgHeight = _showHeight = _uploadHeight = _img.height;
						if ( this.picOrgWidth > this.picOrgHeight ){			// 横向图
							if ( this.picOrgWidth > 500 ){						// 原始图像尺寸大于显示框
								_showWidth = 500;
								_showHeight = this.picOrgHeight / this.picOrgWidth * 500;
							}
							if ( this.picOrgWidth > maxSideLength ){			// 原始图像尺寸大于上传尺寸限制
								_uploadWidth = maxSideLength;
								_uploadHeight = this.picOrgHeight / this.picOrgWidth * maxSideLength;
							}
						} else {												// 纵向图
							if ( this.picOrgHeight > 500 ){
								_showWidth = this.picOrgWidth / this.picOrgHeight * 500;
								_showHeight = 500;
							}
							if ( this.picOrgHeight > maxSideLength ){
								_uploadWidth = this.picOrgWidth / this.picOrgHeight * maxSideLength;
								_uploadHeight = maxSideLength;
							}
						}
						
						this.picCrtWidth = _showWidth;
						this.picCrtHeight = _showHeight;
						this.picScale = _showWidth / this.picOrgWidth;			// 显示尺寸和原始尺寸的缩放比
						_canvas.height = _canvas.height;						// 清空 canvas
						_content.drawImage( _img, ( 500 - _showWidth )*0.5, ( 500 - _showHeight ) * 0.5, _showWidth, _showHeight );			// 绘制显示画布图像 ----------
						_canvasUpload.width = _uploadWidth;						// 清空 _canvasUpload 并重置宽度
						_canvasUpload.height = _uploadHeight;					// 清空 _canvasUpload 并重置高度
						_contentUpload.drawImage( _img, 0, 0, _uploadWidth, _uploadHeight );		// 绘制上传画布图像 ----------
						this.praseRtn = {};					// 清除识别对象框数据
						this.$refs.waitingBox.style.display = "none";			// 隐藏等待动画框
						// this.parseRes();					// 测试画框代码
					}
					_img.src = this.selectedImgSrc;			// 加载图片, 加载完成时触发 onload 事件
				}
				reader.readAsDataURL( _picFile );			// 读取本地图片数据，用于 FormData 上传，现在改为直接把 canvas 中的数据上传，对于大图提升很多网络传输效率
			},
			uploadImage:function(){		// 上传图片
				if ( this.selectedImgSrc == "" ) return;
				let _blobData = dataURLtoBlob( _canvasUpload.toDataURL( 'image/jpeg' ) );
				
				var formData = new FormData();
				formData.append( 'file', _blobData, Date.now() + "-" + Math.round( Math.random() * 10000 ) + ".jpg" );		// Date.now().toLocaleString() - 带逗号格式
				// if ( $_GET != {} ) {
				// 	if ( $_GET[ "dataSet" ] ){
				// 		formData.append( 'dataset', $_GET[ "dataSet" ] );
				// 	} else {
				// 		formData.append( 'dataset', "demo" );
				// 	}
				// } else {
				// 	formData.append( 'dataset', "demo" );
				// }
				formData.append( 'dataset', this.dataModelCategrayName );
				// formData.append( 'file', _picFile ); 	// 直接把 canvas 中的数据上传，对于大图提升很多网络传输效率

				// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
				this.$refs.waitingBox.style.display = "block";
				axios.post( ini["imgRecognitionSvrUrl"], formData ).then(
					( res ) => {		// console.log( res.status ); console.log( res.data );
						// console.log( "上传图片结果：" );
						// console.log( res.data );
						this.parseRes( res.data );			// 调用画框处理函数
					},
					( err ) => {		// 注：使用箭头函数可以避免 this 指向转移的问题，如果不使用箭头函数，则 this 需要事先保存到如 that 的变量中
						this.$refs.waitingBox.style.display = "none";
						console.log( 'Post Image Error:', err.request.status, '| Status Text:' + err.request.statusText );
						alert( err.request.status + ' - ' + err.request.statusText );
					}
				);
				
			},
			dataModelSelected:function(){					// 选择数据模型库
				this.dataModelCategrayName = ( this.dataModelCategary.selectedItem >= 0 ) ? this.dataModelCategary.items[ this.dataModelCategary.selectedItem ] : "demo";
				// console.log( this.dataModelCategary.selectedItem, this.dataModelCategary.items[ this.dataModelCategary.selectedItem ], this.dataModelCategrayName );
			},
			parseRes:function( a_resData = null ){			// 解析返回值 (画框)
				if ( !a_resData ) {
					console.log( "\t本地模拟数据" )
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
				if ( !a_resData["objects"] || a_resData["objects"].length < 1 ) {
					// alert( "Nothing was identified" );
					this.$refs.alertMsg.style.display = "block";
					this.$refs.waitingBox.style.display = "none";
					return;
				} else this.$refs.alertMsg.style.display = "none";
				for ( var i = 0; i < a_resData["objects"].length; i ++ )
				{	// 把返回的中心点和比率数据解析成位置和宽高数据
					a_resData["objects"][ i ]["relative_coordinates"]["b_x"] = a_resData["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 ) + ( 500 - this.picCrtWidth ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates"]["b_y"] = a_resData["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 ) + ( 500 - this.picCrtHeight ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates"]["b_width"] = a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
					a_resData["objects"][ i ]["relative_coordinates"]["b_height"] = a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
					a_resData["objects"][ i ]["confidence_s"] = toPercent( a_resData["objects"][ i ]["confidence"], 1 );
					// console.log( toPercent( a_resData["objects"][ i ]["confidence"], 1 ) );
				}
				this.praseRtn = a_resData;
				this.$refs.waitingBox.style.display = "none";
			},
			// btnMouseOver:function( e ){ e.target.className="nes-btn is-primary"; },				// 鼠标在按钮上移入
			// btnMouseLeave:function( e ){ e.target.className="nes-btn"; },						// 鼠标在按钮上移出
			clickImage:function(){ this.$refs.btnSelPic.dispatchEvent(new MouseEvent('click')); }
		}
	});
}

// 获取 URL 中的 GET 参数
function getGetArgs(){
	var url = window.document.location.href.toString(); //获取的完整url
	var u = url.split( "?" );
	if ( typeof( u[ 1 ] ) == "string" ){
		u = u[ 1 ].split( "&" );
		var get = {};
		for( var i in u ){
			var j = u[ i ].split( "=" );
			get[ j[ 0 ] ] = j[ 1 ];
		}
		return get;
	} else {
		return {};
	}
}

function toPercent( num, point = 0 ){	// 小数转百分比函数
	if ( typeof( num ) != "number" ) return 0;
	if ( typeof( point ) != "number" ) return 0;
	return Number( num * 100 ).toFixed( point );
}

// 加载配置文件失败时的处理代码
function startFail( a_err ){
	var app = new Vue({					// 使用 Vue 引擎
		el:"#app",						// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			selectedImgSrc:"",
			picNameLabelColor:"color: #ff0000;",
			selectedImgName:"Load Ini File Failed :-(",
		},
	});
}

// 把从 canvas 中读取的 base64 数据转换成 blod 格式数据
function dataURLtoBlob( base64Data ) {
	var byteString;
	if ( base64Data.split( ',' )[ 0 ].indexOf( 'base64' ) >= 0 )
		byteString = atob( base64Data.split( ',' )[ 1 ] );						// atob() 将 ascii 码解析成 binary 数据; btoa() 将 binary 编码成 ascii 数据; 这对函数不能简单的用于对 Unicode 字符的处理
	else
		byteString = unescape( base64Data.split( ',' )[ 1 ] );
	var mimeString = base64Data.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];
	var ia = new Uint8Array( byteString.length );
	for ( var i = 0; i < byteString.length; i++ ) {
		ia[ i ] = byteString.charCodeAt( i );
	}
	return new Blob( [ ia ], { type: mimeString });
}

// //dataURL to blob
// function dataURLtoBlob( dataurl ) {
// 	var arr = dataurl.split( ',' ), mime = arr[ 0 ].match( /:(.*?);/ )[ 1 ]
// 	var bstr = atob( arr[ 1 ] )
// 	var n = bstr.length;
// 	var u8arr = new Uint8Array( n );
// 	while ( n-- ) {
// 		u8arr[ n ] = bstr.charCodeAt( n );
// 	}
// 	return new Blob( [ u8arr ], { type: mime } );
// }

/*
formProxy.append( 'photo', readStream );					// 添加一个文件型参数到 formData 对象中
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