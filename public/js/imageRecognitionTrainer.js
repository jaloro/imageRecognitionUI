var ini;
var categaryItems;

// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
let getIni = axios.get( "./conf/imageRecognitionIni.json" )
.then(
	res_ini => {						// 加载配置文件成功
		ini = res_ini.data;
		axios.get( "./conf/coco.names" )
		.then(
			res_categray => {			// 加载物品类别数据文件成功
				categaryItems = res_categray.data;
				start( true, "" );
			},
			error_categray => { start( false, error_categray.message ) }		// { startFail( error_categray.message, 2 ); }
		);
	},
	error_ini => {	start( false, error_ini.message );	}						// 加载配置文件失败
);

function start( a_status, a_msg ){
	// ini = a_ini.data;
	let _status = a_status;
	let maxSideLength = ini ? ini[ "maxSideLength" ] : 416;						// 图像上传最大边长尺寸
	let _picFile;						// 图片文件对象
	let _canvas;						// 图像显示画布
	let _content;
	let _canvasUpload;					// 图像上传画布
	let _contentUpload;
	let _canvasEditor;					// 对象框底图画布
	let _contentEditor;
	let draging = false;
	let dragObj;						// 当前选中拖动的对象
	let _selectRowBgColor = "#ffa";
	let boxX, boxY, mouseX, mouseY, offsetX, offsetY;
	let _objMinSize = 10;
	let _editorCanvasWidth, _editorCanvasHeight;
	let app = new Vue({					// 使用 Vue 引擎
		el:"#app",						// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			selectedImgSrc:"",
			picNameLabelColor:"color: #b4b;",
			selectedImgName:"- No image were seleted -",
			picOrgWidth: 1,				// 图像原始宽度
			picOrgHeight: 1,			// 图像原始高度
			picScale: 1,
			picCrtWidth: 1,				// 用于绘制识别对象框的宽度
			picCrtHeight: 1,			// 用于绘制识别对象框的高度
			categary: { selectedItem:-1, items:["Crayfish", "Hairy crabs", "Mantis shrimp"] },
			selectedRowIndex: -1,		// 对象列表数据表格中选中的行号
			oldBorderStyle: "",			// 选中前对相框框线风格
			oldOpacityStyle: "",		// 选中前对象框透明度
			_yTop: 1,					// 编辑器对象上框线的位置
			_yBottom: 10,				// 编辑器对象下框线的位置
			_xLeft: 1,					// 编辑器对象左框线的位置
			_xRight: 10,				// 编辑器对象右框线的位置
			widthPercentage: 0.8,		// 识别框宽度百分比
			heightPercentage: 0.8,		// 识别框高度百分比
			center_x: 0.5,				// 识别框中央位置X百分比
			center_y: 0.5,				// 识别框中央位置Y百分比
			categrayName: "---",		// 识别对象类别名
			praseRtn: {"filename":"","objects":[],"frame_id":1},
			parse_Res:	'<span class="objectBox" style="left: 160px; top: 200px; width: 150px; height: 132px; z-index: 2;" title="17(95.2%)">\
							<span class="objectID">id:</span> <span class="objectValue">17</span><br/><span class="objectID">P:</span> <span class="objectValue">95.2%</span>\
						</span>'
		},
		mounted:function(){				// vue 实例被挂载后执行的代码
			this.$nextTick( function(){						// 此写法是为了保证整个页面被渲染完毕后再执行需要的代码
				this.$refs.errorMsgBox.style.display = ( _status ? "none" : "block" );				// 有错误，则遮挡整个页面
				
				this.$refs.objectListTable.style.display = "none";
				
				// console.log( categaryItems );
				this.categary.items = categaryItems.trim().split( "\n" );							// 把对象分类文本信息解析成数组
				
				_canvas = this.$refs.canvasPic;				// 初始化显示画布 --------------
				_canvasUpload = this.$refs.canvasUpload;	// 初始化上传画布 --------------
				_canvasEditor = this.$refs.canvasEditorPic;	// 初始化对象框底图画布 --------------
			});
		},
		methods:{
			clickRoot:function( e ){						// 在 vue 根容器上添加一个捕获阶段的click事件，通过判断条件来处理是否劫持其他子对象的click事件
				if ( !_status ){ e.stopPropagation(); }		// 停止事件继续传播（在捕获和冒泡阶段皆可）
			},
			selectImage:function( e ){						// 选择本地图片并加载预览
				// 判断 canvas 是否兼容有效
				if ( _canvas.getContext ) _content = _canvas.getContext("2d");
				else return;
				if ( _canvasUpload.getContext ) _contentUpload = _canvasUpload.getContext("2d");
				else return;
				if ( _canvasEditor.getContext ) _contentEditor = _canvasEditor.getContext("2d");
				else return;
				_picFile = e.target.files[ 0 ];
				if ( !_picFile ) return;
				this.$refs.waitingBox.style.display = "block";
				this.$refs.alertMsg.style.display = "none";
				this.$refs.objectListTable.style.display = "none";
				this.selectedRowIndex = -1;
				let reader = new FileReader();
				reader.onload = () => {	//reader.onload = (e)=>{				//此处e可省略，因为 e.result 即 reader;  todo? 此处用 function 替代 => 无法正确执行？？？可能是因为 this 指向问题，在箭头函数中，this指向正确的vue对象
					this.selectedImgSrc = reader.result;						// 等同于使用 e 参数时的： e.target.result;
					this.selectedImgName = _picFile.name;
					let _img = new Image();
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
								_showHeight = Math.round( ( this.picOrgHeight / this.picOrgWidth * 500 ) );
							}
							if ( this.picOrgWidth > maxSideLength ){			// 原始图像尺寸大于上传尺寸限制，则约束上传尺寸
								_uploadWidth = maxSideLength;
								_uploadHeight = Math.round( this.picOrgHeight / this.picOrgWidth * maxSideLength );
							}
						} else {												// 纵向图
							if ( this.picOrgHeight > 500 ){
								_showWidth = Math.round( ( this.picOrgWidth / this.picOrgHeight * 500 ) );
								_showHeight = 500;
							}
							if ( this.picOrgHeight > maxSideLength ){
								_uploadWidth = Math.round( this.picOrgWidth / this.picOrgHeight * maxSideLength );
								_uploadHeight = maxSideLength;
							}
						}
						
						this.picCrtWidth = _showWidth;
						this.picCrtHeight = _showHeight;
						this.picScale = _showWidth / this.picOrgWidth;			// 显示尺寸和原始尺寸的缩放比
						_canvas.height = _canvas.height;						// 清空 canvas
						_content.drawImage( _img, Math.round( ( 500 - _showWidth ) * 0.5 ), Math.round( ( 500 - _showHeight ) * 0.5 ), _showWidth, _showHeight );					// 绘制显示画布图像 ----------
						_canvasEditor.height = _canvas.height;					// 清空 _canvasEditor
						_contentEditor.drawImage( _img, Math.round( ( 500 - _showWidth ) * 0.5 ), Math.round( ( 500 - _showHeight ) * 0.5 ), _showWidth, _showHeight );				// 绘制显示画布图像 ----------
						_canvasUpload.width = _uploadWidth;						// 清空 _canvasUpload 并重置宽度
						_canvasUpload.height = _uploadHeight;					// 清空 _canvasUpload 并重置高度
						_contentUpload.drawImage( _img, 0, 0, _uploadWidth, _uploadHeight );		// 绘制上传画布图像 ----------
						this.praseRtn = {"filename":"","objects":[],"frame_id":1};					// 清除识别对象框数据
						this.praseRtn.filename = this.selectedImgName;
						
						this.$refs.objectsBox.style.left = this.$refs.drawBox.style.left = Math.round( ( 500 - this.picCrtWidth ) * 0.5 ) + "px";				// 调整对象框DIV的位置和宽高
						this.$refs.objectsBox.style.top = this.$refs.drawBox.style.top = Math.round( ( 500 - this.picCrtHeight ) * 0.5 ) + "px";
						this.$refs.objectsBox.style.width = this.$refs.drawBox.style.width = this.picCrtWidth + "px";
						this.$refs.objectsBox.style.height = this.$refs.drawBox.style.height = this.picCrtHeight + "px";
						
						this.$refs.editorObjectBoxDiv.style.left = Math.round( ( 500 - this.picCrtWidth ) * 0.5 ) + "px";										// 调整框编辑器中对象框DIV的位置和宽高
						this.$refs.editorObjectBoxDiv.style.top = Math.round( ( 500 - this.picCrtHeight ) * 0.5 ) + "px";
						this.$refs.editorObjectBoxDiv.style.width = this.picCrtWidth + "px";
						this.$refs.editorObjectBoxDiv.style.height = this.picCrtHeight + "px";
						
						this._yTop = Math.round( this.picCrtHeight * 0.05 );
						this._yBottom = Math.round( this.picCrtHeight * 0.95 );
						this._xLeft = Math.round( this.picCrtWidth * 0.05 );
						this._xRight = Math.round( this.picCrtWidth * 0.95 );
						this.resetLinePosition();
						
						this.$refs.waitingBox.style.display = "none";			// 隐藏等待动画框
						// this.parseRes();					// 测试画框代码
					}
					_img.src = this.selectedImgSrc;			// 加载图片, 加载完成时触发 onload 事件
				}
				reader.readAsDataURL( _picFile );			// 读取本地图片数据，用于 FormData 上传，现在改为直接把 canvas 中的数据上传，对于大图提升很多网络传输效率
			},
			uploadImage:function(){							// 上传识别图片
				if ( this.selectedImgSrc == "" ) return;
				let _blobData = dataURLtoBlob( _canvasUpload.toDataURL( 'image/jpeg' ) );
				
				let formData = new FormData();
				formData.append( 'file', _blobData, Date.now() + "-" + Math.round( Math.random() * 10000 ) + ".jpg" );		// Date.now().toLocaleString() - 带逗号格式
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
					this.$refs.alertMsg.style.display = "block";
					this.$refs.waitingBox.style.display = "none";
					this.praseRtn = {"filename":"","objects":[],"frame_id":1};
					this.$refs.objectListTable.style.display = "none";
					return;
				} else this.$refs.alertMsg.style.display = "none";
				
				for ( let i = 0; i < a_resData["objects"].length; i ++ ){		// 把返回的中心点和比率数据解析成位置和宽高数据
					a_resData["objects"][ i ]["index"] = i;
					a_resData["objects"][ i ]["relative_coordinates_s"] = {};
					a_resData["objects"][ i ]["relative_coordinates_s"]["b_x"] = a_resData["objects"][ i ]["relative_coordinates"]["center_x"] * this.picCrtWidth - ( a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth * 0.5 );			// + ( 500 - this.picCrtWidth ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates_s"]["b_y"] = a_resData["objects"][ i ]["relative_coordinates"]["center_y"] * this.picCrtHeight - ( a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight * 0.5 );		// + ( 500 - this.picCrtHeight ) * 0.5;
					a_resData["objects"][ i ]["relative_coordinates_s"]["b_width"] = a_resData["objects"][ i ]["relative_coordinates"]["width"] * this.picCrtWidth;
					a_resData["objects"][ i ]["relative_coordinates_s"]["b_height"] = a_resData["objects"][ i ]["relative_coordinates"]["height"] * this.picCrtHeight;
					a_resData["objects"][ i ]["confidence_s"] = toPercent( a_resData["objects"][ i ]["confidence"], 1 );
					a_resData["objects"][ i ]["css_bg_color"] = percentToColor( a_resData["objects"][ i ]["confidence"] );
				}
				this.praseRtn = a_resData;
				this.$refs.waitingBox.style.display = "none";
				this.$refs.objectListTable.style.display = "block";
			},
			// btnMouseOver:function( e ){ e.target.className="nes-btn is-primary"; },				// 鼠标在按钮上移入
			// btnMouseLeave:function( e ){ e.target.className="nes-btn"; },						// 鼠标在按钮上移出
			clickBox:function( e ){							// 点击识别对象框
				// e.srcElement 和 e.target 相同
				if ( this.selectedRowIndex > 0 ){
					this.$refs.objectListTable.rows[ this.selectedRowIndex ].style["background-color"] = "#fff";
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.border = this.oldBorderStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.opacity = this.oldOpacityStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style["z-index"] = "0";
				}
				if ( e.target.attributes.class.value == "objectsBox" ){ return; }
				this.selectedRowIndex = Number( e.target.attributes.indexnum.value ) + 1;			// 框为0序，行为1序，因为第0行为表头； 问题？ 为什么不能用直接用 e.target.indexnum 或 e.target[ "indexnum" ] 来访问到该属性值
				this.$refs.objectListTable.rows[ this.selectedRowIndex ].style["background-color"] = _selectRowBgColor;
				this.oldBorderStyle = e.target.style.border;
				this.oldOpacityStyle = e.target.style.opacity;
				e.target.style.border = "3px dashed #c0c";
				e.target.style.opacity = "1";
				e.target.style["z-index"] = "" + this.$refs.objectsBox.children.length;
			},
			clickRow:function( e ){							// 点击对象框数据表格上的某行
				if ( this.selectedRowIndex > 0 ){			// 第0行为表头，数据从第1行开始
					this.$refs.objectListTable.rows[ this.selectedRowIndex ].style[ "background-color" ] = "#fff";
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.border = this.oldBorderStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.opacity = this.oldOpacityStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style[ "z-index" ] = "0";
				}
				if( e.srcElement.tagName == "TD" ){
					e.srcElement.parentElement.style[ "background-color" ] = _selectRowBgColor;
					this.selectedRowIndex = e.srcElement.parentElement.rowIndex;
					this.oldBorderStyle = this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.border;
					this.oldOpacityStyle = this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.opacity;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.border = "3px dashed #c0c";
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.opacity = "1";
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style[ "z-index" ] = "" + this.$refs.objectsBox.children.length;
				}
				// event.srcElement.tagName和event.srcElement.parentElement在这里的应用；
				// event是触发时间的源对象，而srcElement则就是选中对象，而parentElement则是选中对象的父层对象；以当前的样例来简单解释的话，就是说，鼠标放上table，从而激活了时间getrow（this），当鼠标放在任一单元格之上时，它的srcElement都是 td，并且它的parentElement也就是tr一行了，则找到一行的对象了
			},
			addBox:function(){								// 打开对象框绘制界面
				if ( this.selectedImgSrc == "" ) return;
				this.$refs.editorBox.style.display = "block";
			},
			delBox:function(){								// 删除数据表格中的某行识别框数据
				if ( this.selectedRowIndex > 0 ) {
					this.$refs.objectListTable.rows[ this.selectedRowIndex ].style["background-color"] = "#fff";		// style["background-color"] 等效于 style.background
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.border = this.oldBorderStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style.opacity = this.oldOpacityStyle;
					this.$refs.objectsBox.children[ this.selectedRowIndex - 1 ].style["z-index"] = "0";
					
					this.praseRtn.objects.splice( this.selectedRowIndex - 1, 1 );			// this.selectedRowIndex 为 1序索引
					this.selectedRowIndex = -1;
					if ( this.praseRtn.objects.length < 1 ) this.$refs.objectListTable.style.display = "none";
				}
			},
			closeBoxEditor:function(){						// 关闭对象框绘制界面
				this.$refs.editorBox.style.display = "none";
			},
			categrayItemSelected:function( e ){				// 选择了物品类别
				this.categrayName = ( this.categary.selectedItem >= 0 ) ? this.categary.items[ this.categary.selectedItem ] : "---";
			},
			startDrag:function( e ){						// 鼠标按下
				// console.log( "start drag", e.target );
				dragObj = e.target;
				draging = true;
				
				// 获取元素所在的坐标
				boxX = dragObj.offsetLeft;
				boxY = dragObj.offsetTop;
				
				// 获取鼠标所在的坐标
				mouseX = parseInt( getMouseXY( e ).x );
				mouseY = parseInt( getMouseXY( e ). y );
				
				// 鼠标相对元素左和上边缘的坐标
				offsetX = mouseX - boxX;
				offsetY = mouseY - boxY;
				
				document.onmousemove = this.dragMove;
				document.onmouseup = this.stopDrag;
			},
			stopDrag:function( e ){							// 鼠标弹起时
				// console.log( "stop drag" );
				draging = false;
				this.center_x = Math.round( ( ( this._xRight - this._xLeft ) * 0.5 + this._xLeft ) / this.picCrtWidth * 1000000 ) / 1000000;
				this.center_y = Math.round( ( ( this._yBottom - this._yTop ) * 0.5 + this._yTop ) / this.picCrtHeight * 1000000 ) / 1000000;
				this.widthPercentage = Math.round( ( this._xRight - this._xLeft ) / this.picCrtWidth * 1000000 ) / 1000000;
				this.heightPercentage = Math.round( ( this._yBottom - this._yTop ) / this.picCrtHeight * 1000000 ) / 1000000;
			},
			dragMove:function( e ){							// 拖动边框线时
				if ( draging ) {
					// 获取移动后的元素的坐标
					var x = getMouseXY( e ).x - offsetX;
					var y = getMouseXY( e ).y - offsetY;
				
					// 计算可移动位置的大小， 保证元素不会超过可移动范围
					// 此处就是父元素的宽度减去子元素宽度
					var width = this.$refs.editorObjectBoxDiv.clientWidth - dragObj.offsetWidth;						// dragObj 在鼠标按下事件中赋值
					var height = this.$refs.editorObjectBoxDiv.clientHeight - dragObj.offsetHeight;
				
					// min方法保证不会超过右边界，max保证不会超过左边界, _objMinSize
					if ( dragObj.id == "boxLeft" ){
						x = Math.min( Math.max( 0, x ), this._xRight - _objMinSize );
					}else if ( dragObj.id == "boxRight" ){
						x = Math.min( Math.max( this._xLeft - 4 + _objMinSize, x ), width );
					}else{
						x = 0;	//Math.min( Math.max( 0, x ), width );
					}
					
					if ( dragObj.id == "boxTop" ){
						y = Math.min( Math.max( 0, y ), this._yBottom - _objMinSize );
					}else if ( dragObj.id == "boxBottom" ){
						y = Math.min( Math.max( this._yTop - 4 + _objMinSize, y ), height );
					}else{
						y = 0;
					}
				
					// 给元素及时定位
					dragObj.style.left = x + 'px';
					dragObj.style.top = y + 'px';
					
					// 刷新图像半透明遮罩位置大小
					switch ( dragObj.id ){
						case "boxTop":
							this._yTop = y;
							break;
						case "boxBottom":
							this._yBottom = y + 4;
							break;
						case "boxLeft":
							this._xLeft = x;
							break;
						case "boxRight":
							this._xRight = x + 4;
							break;
					}
					this.resetLinePosition();
				}
			},
			resetLinePosition:function(){					// 设置选择框遮罩等【内部调用函数】
				this.$refs.lineTop.style.top = this._yTop + "px";
				this.$refs.lineBottom.style.top = ( this._yBottom - 4 ) + "px";
				this.$refs.lineLeft.style.left = this._xLeft + "px";
				this.$refs.lineRight.style.left = ( this._xRight - 4 ) + "px";
				
				this.$refs.maskTop.style.height = this.$refs.lineTop.style.top;
				this.$refs.maskLeft.style.top = this.$refs.maskRight.style.top = this.$refs.lineTop.style.top;
				this.$refs.maskLeft.style.height = this.$refs.maskRight.style.height = ( this._yBottom - this._yTop ) + "px";
				this.$refs.maskLeft.style.width = this._xLeft + "px";
				this.$refs.maskRight.style.width = ( this.picCrtWidth - this._xRight ) + "px";
				this.$refs.maskBottom.style.height = ( this.picCrtHeight - this._yBottom ) + "px";
			},
			confirmPosition:function(){						// 确认绘制框信息
				if ( this.categary.selectedItem < 0 ){
					this.$refs.btnNoticeCategray.dispatchEvent( new MouseEvent( 'click' ) );		// firefox 中貌似没起作用
					return;
				}
				if ( !this.praseRtn.objects ) this.praseRtn.objects = [];
				this.praseRtn.objects.push( {"index":this.praseRtn.objects.length,"class_id":this.categary.selectedItem,"confidence":99,"confidence_s":toPercent(0.99,1),"name":this.categrayName,"relative_coordinates_s":{"b_x":this._xLeft,"b_y":this._yTop,"b_width":this._xRight-this._xLeft,"b_height":this._yBottom-this._yTop},"relative_coordinates":{"center_x":this.center_x,"center_y":this.center_y,"width":this.widthPercentage,"height":this.heightPercentage}} );
				this.$refs.objectListTable.style.display = "block";
				this.closeBoxEditor();						// 关闭编辑器窗口
				// console.log( this.praseRtn.objects );
			},
			saveBoxData:function(){							// 保存框数据
				if ( this.praseRtn.objects.length < 1 ) return;					// 如果没有框数据，则返回
				const _element = document.createElement( 'a' );
				let _data = "";
				for ( let _i = 0; _i < this.praseRtn.objects.length; _i ++ ){
					_data = _data + ( ( _data == "" ) ? "" : "\n" ) + this.praseRtn.objects[ _i ][ "class_id" ] + " " + this.praseRtn.objects[ _i ][ "relative_coordinates" ][ "center_x" ] + " " + this.praseRtn.objects[ _i ][ "relative_coordinates" ][ "center_y" ] + " " + this.praseRtn.objects[ _i ][ "relative_coordinates" ][ "width" ] + " " + this.praseRtn.objects[ _i ][ "relative_coordinates" ][ "height" ];
				}
				console.log( _data );
				_element.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( _data ) );		// 保存的数据
				_element.setAttribute( 'download', this.selectedImgName.substring( 0, this.selectedImgName.lastIndexOf( "." ) ) + '.txt' );						// 保存的文件名
				_element.style.display = 'none';
				_element.click();
			}
		}
	});
}

function getMouseXY( e ){				// 函数用于获取鼠标的位置
	let x = 0, y = 0;
	e = e || window.event;
	if ( e.pageX ) {
		x = e.pageX
		y = e.pageY
	} else {
		x = e.clientX + document.body.scrollLeft - document.body.clientLeft
		y = e.clientY + document.body.scrollTop - document.body.clientTop
	}
	return {
		x: x,
		y: y
	}
}

function toPercent( a_num, a_point = 0 ){					// 小数转百分比函数
	if ( typeof( a_num ) != "number" ) return 0;
	if ( typeof( a_point ) != "number" ) return 0;
	return Number( a_num * 100 ).toFixed( a_point );
}

function percentToColor( a_percent ){						// 根据百分比数值设定颜色值
	if ( a_percent > 0.9 ) return "#0cf";
	if ( a_percent > 0.8 ) return "#0f0";
	if ( a_percent > 0.7 ) return "#cf0";
	if ( a_percent > 0.6 ) return "#ec0";
	if ( a_percent > 0.5 ) return "#f70";
	return "#f00";
}

function dataURLtoBlob( base64Data ) {						// 把从 canvas 中读取的 base64 数据转换成 blod 格式数据
	let byteString;
	if ( base64Data.split( ',' )[ 0 ].indexOf( 'base64' ) >= 0 )
		byteString = atob( base64Data.split( ',' )[ 1 ] );						// atob() 将 ascii 码解析成 binary 数据; btoa() 将 binary 编码成 ascii 数据; 这对函数不能简单的用于对 Unicode 字符的处理
	else
		byteString = unescape( base64Data.split( ',' )[ 1 ] );
	let mimeString = base64Data.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];
	let ia = new Uint8Array( byteString.length );
	for ( let i = 0; i < byteString.length; i++ ) {
		ia[ i ] = byteString.charCodeAt( i );
	}
	return new Blob( [ ia ], { type: mimeString });
}




// function fakeClick( a_obj ) { 
// 	var _ev = document.createEvent( "MouseEvents" );
// 	_ev.initMouseEvent( "click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null );
// 	a_obj.dispatchEvent( _ev );
// }

// function exportRaw( a_name, a_data ) {
// 	var urlObject = window.URL || window.webkitURL || window;
// 	var export_blob = new Blob( [ a_data ] );
// 	var save_link = document.createElementNS( "http://www.w3.org/1999/xhtml", "a" )
// 	save_link.href = urlObject.createObjectURL( export_blob );
// 	save_link.download = a_name;
// 	fakeClick( save_link );
// }

// var w = window.open("about:blank", "导出", "height=0,width=0,toolbar=no,menubar=no,scrollbars=no,resizable=on,location=no,status=no");
// var dt = new Date();
// w.document.charset = "gb2312";
// w.document.write(exportData);
// w.document.execCommand("SaveAs", false, dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate() + "-" + dt.getTime()  +".txt");
// w.close();





























// function isEmptyObject( a_arg ) {		// 判断是否是空对象
// 	for ( let key in a_arg ) {
// 		return false;
// 	}
// 	return true;
// }

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