function start(){
	var app = new Vue({
		el:"#app",						// 把 Vue 加载到 id="app" 的 html 元素上
		data:{
			page:""
		},
		mounted:function(){				// vue 实例被挂载后执行的代码
			this.$nextTick(function(){						// 此写法是为了保证整个页面被渲染完毕后再执行需要的代码
				// 获取 GET 参数
				var _urlGet = window.document.location.href.toString().split("?"); //获取的完整url
				// console.log( _urlGet );
				var _getArgs = "";
				if ( _urlGet.length > 1 ) _getArgs = "?" + _urlGet[ 1 ];
				// this.page = false ? "imageRecognitionDemoWithCanvas.html" : "imageRecognitionDemoWithCanvasIphone.html";					// 测试分支代码
				this.page = isPc() ? "imageRecognitionDemoWithCanvas.html" + _getArgs : "imageRecognitionDemoWithCanvasIphone.html" + _getArgs;
			});
		},
		methods:{
			
		}
	});
}

function isPc() {
	var userAgentInfo = navigator.userAgent;
	var _agents = [ "Android", "iPhone","SymbianOS", "Windows Phone", "iPod" ];
	var _flag = true;
	for ( var v = 0; v < _agents.length; v++ ) {
		if ( userAgentInfo.indexOf( _agents[ v ] ) > 0 ) {
			_flag = false;
			break;
		}
	}
	if ( window.screen.width >= 768 ) {
		_flag = true;
	}
	return _flag;
}

start();
