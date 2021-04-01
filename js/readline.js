global.rl = require('readline').createInterface( { prompt:"", tabSize:4, input: process.stdin, output: process.stdout } );					// 初始化行指令输入功能;
global.defaultPrompt = "'Tsf'".grey.inverse + " > ";

rl.on( 'line', function( a_line ){
	let _line = a_line.trim().split(" ");
	switch( _line[ 0 ] ) {	// _line[1] 可作为指令的参数进行后续处理
		case 'cls':			// 清屏
			console.clear();	// 清屏指令，或者用 // funcs.print( '\033[2J', 1 );
			rl.prompt();
			break;
		case "exit":		// 退出程序
			process.exit( 0 );					// 退出命令行输入模式
			break;
		case "time":		// 查看当前时间值
			console.log( '\t' + funcs.now().magenta.inverse );
			console.log( '\t---------------------------------------------------------------------'.grey );
			break;
		case "debug":		// 设置 debug 模式
			debug = !debug;
			console.log( "\t'Debug' --> " + ( debug ? funcs.true : funcs.false ).inverse );
			console.log( '\t---------------------------------------------------------------------'.grey );
			break;
		case "clean":		// 删除接收到的文件
			funcs.delDir( imgsDir, false );	// 第二个参数为 false 表示删除文件夹下所有文件和子文件夹，但保留文件夹本身
			console.log( "\tAll received files have been deleted.".cyan );
			console.log( '\t---------------------------------------------------------------------'.grey );
			break;
		case "reload":		// 重新加载配置文件
			// 重新加载配置文件（同步风格 - 会产生阻塞），此处用 fs.readFileSync() 重新加载，而不用 require，因为 require 不会重新加载。
			try {
				let _data = fs.readFileSync( iniFile );			// 读取配置文件
				console.log( "[ " + "OK".green.inverse + " ]" + " Reloading configuration file successfully.".cyan + " @" + funcs.now().magenta );
				try {
					let _ini = JSON.parse( _data );			// 解析配置文件
					iniResult = _ini;
					console.log( "[ " + "OK".green.inverse + " ]" + " Parse configuration file successfully.".cyan + " @" + funcs.now().magenta );
					if ( debug ) {
						funcs.printObject( iniResult, 1, "\t" );
					}
					console.log( '\t---------------------------------------------------------------------'.grey );		// 灰色分割线
				} catch ( err ) {							// 解析配置文件错误
					console.log( "[ " + "FAIL".error.inverse + " ]" + ( " Failed to '" + "parse".white.underline + "' configuration file!" ).error + " @" + funcs.now().magenta );
					if ( debug ) {
						console.error( err );
					}
					console.log( '\t---------------------------------------------------------------------'.error );		// 红色分割线
				}
			} catch ( err ) {								// 读取配置文件错误
				console.log( "[ " + "FAIL".error.inverse + " ]" + ( " Failed to '" + "reload".white.underline + "' configuration file!" ).error + " @" + funcs.now().magenta );
				if ( debug ) {
					console.error( err );
				}
				console.log( '\t---------------------------------------------------------------------'.error );			// 红色分割线
			}
			break;
		case "state":		// 设置服务器状态
			svrState = !svrState;
			console.log( "\t'State' --> " + ( svrState == 1 ? funcs.true : funcs.false ).inverse );
			console.log( '\t---------------------------------------------------------------------'.grey );
			break;
		case "status":
			let _files = funcs.filesNum( imgsDir );
			console.log( "\t┌───────────────┬───────────────┐" );
			console.log( "\t│ IP Address\t│ " + funcs.getIPAdress().bBlue + "\t│" );
			// console.log( "\t├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┼┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤" );
			console.log( "\t│ Port\t\t│ " + ( '' + fastify.server.address().port ).yellow + "\t\t│" );
			console.log( "\t├───────────────┼───────────────┤" );
			console.log( "\t│ 'Debug'\t│ " + ( debug ? funcs.true : funcs.false ) + "\t\t│" );
			console.log( "\t│ 'State'\t│ " + ( svrState == 1 ? funcs.true : funcs.false ) + "\t\t│" );
			console.log( "\t├───────────────┼───────────────┤" );
			console.log( "\t│ Num of files\t│ " + ( '' + _files[ "filesNum" ] ).yellow + "\t\t│" );
			console.log( "\t│ Num of folders│ " + ( '' + _files[ "foldersNum" ] ).yellow + "\t\t│" );
			console.log( "\t└───────────────┴───────────────┘" );
			break;
		case "help":		// 帮助指令 - 查看指令列表
			console.log( ( "\t┌────────────────────────────────────────────────────────┐" +
				"\n\t clean\t - Delete received files." +
				"\n\t cls\t - Clear screen." +
				"\n\t debug\t - Turn debug mode on or off." +
				"\n\t exit\t - Exit program." +
				"\n\t help\t - View command list." +
				"\n\t reload\t - Reload configuration file." +
				"\n\t state\t - Change server state." +
				"\n\t status\t - Displays service status." +
				"\n\t time\t - Displays the current time." +
				"\n\t└────────────────────────────────────────────────────────┘" ).warn );
			break;
		case "":			// 空指令（回车）
			break;
		default:			// 非指令输出处理
			console.log( ( "\tThe '" + _line[ 0 ].white.underline + "' instruction or parameter does not exist! \n\tEnter '" + "help".white.underline + "' to view the command list.").error );
			console.log( '\t---------------------------------------------------------------------'.error );				// 红色分割线
			break;
	}
	rl.prompt();
});

rl.on( 'close', function() {
	process.exit( 0 );
});

// console.log( "[ " + "OK".green.inverse + " ]" + " Command line command mode started successfully.".cyan );
// console.log( ( "\tEnter the '" + "help".white.underline + "' command to get the command list." ) );







// bak ============================================================================================================================================//

			// 重新加载配置文件（异步风格 - 不会产生阻塞），此处用 fs.readFile() 重新加载，而不用 require，因为 require 不会重新加载。
			// fs.readFile('./conf/res_ini.json',"utf-8",( err, data ) => {		// 读取配置文件
			// 	if ( err ) {
			// 		rl.setPrompt('');
			// 		rl.prompt();
			// 		console.log( "[" + "FAIL".error.inverse + "]" + " Failed to 'reload' configuration file.".error );
			// 		if ( debug ) {
			// 			console.log( err );
			// 		}
			// 		console.log( '--------------------------------------------------------------------'.error );
			// 		rl.setPrompt(defaultPrompt);
			// 		rl.prompt();		// 此句是因为有可能回调函数跳出了当前处理函数（没有闭环？），switch 外的脚本没有继续执行，所以额外增加此句以恢复行命令输入提示符
			// 	}
			// 	else {
			//		console.log( "[" + "OK".green.inverse + "]" + " Reloading configuration file successfully.".cyan + " @" + funcs.now().magenta );
			// 		try {
			// 			let _ini = JSON.parse( data );			// 解析配置文件
			// 			iniResult = _ini;
			// 			rl.setPrompt('');
			// 			rl.prompt();
			// 			console.log( "[" + "OK".green.inverse + "]" + " Parse configuration file successfully.".cyan + " @" + funcs.now().magenta );
			// 			if ( debug ) {
			// 				funcs.print( " Reload ".cyan.inverse + " <-- " );
			// 				console.log( iniResult );
			// 				console.log( '--------------------------------------------------------------------'.grey );
			// 				rl.setPrompt( defaultPrompt );
			// 				rl.prompt();	// 此句是因为有可能回调函数跳出了当前处理函数（没有闭环？），switch 外的脚本没有继续执行，所以额外增加此句以恢复行命令输入提示符
			// 			} else {
			// 				console.log( '--------------------------------------------------------------------'.grey );
			// 				rl.setPrompt( defaultPrompt );
			// 				rl.prompt();	// 此句是因为有可能回调函数跳出了当前处理函数（没有闭环？），switch 外的脚本没有继续执行，所以额外增加此句以恢复行命令输入提示符
			// 			}
			// 		} catch ( err ) {
			// 			rl.setPrompt('');
			// 			rl.prompt();
			// 			console.log( "[" + "FAIL".error.inverse + "]" + "Failed to 'parse' configuration file.".error + " @" + funcs.now().magenta );
			// 			if ( debug ) {
			//				console.error( err );
			//			}
			// 			console.log( '--------------------------------------------------------------------'.error + " @" + funcs.now().magenta );
			// 			rl.setPrompt( defaultPrompt );
			// 			rl.prompt();		// 此句是因为有可能回调函数跳出了当前处理函数（没有闭环？），switch 外的脚本没有继续执行，所以额外增加此句以恢复行命令输入提示符
			// 		}
			// 	}
			// });