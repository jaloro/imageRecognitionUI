async function asyncRequire( a_libName, a_opts = null, a_log = null ) {
	let _rtn;
	try {
		if ( !a_opts ) _rtn = await require( a_libName );						// 加载无参数模块
		else _rtn = await require( a_libName )( a_opts );						// 加载带参数模块
	} catch ( e ) {
		console.log( "[ \x1B[30m\x1B[41mFAIL\x1b[0m ]'\x1B[4m\x1B[91m\x1B[4m" + a_libName + "\x1b[0m' loading failed." );					// \x1b[0m 效果终止符
		// console.log( "\t\x1B[4m" + e.message + "\x1B[0m");
		console.log( "\x1B[31m\-----------------------------------------------------------------------------\nexit\x1B[0m" );
		process.exit( 1 );
	}
	console.log( "[ \x1B[30m\x1B[42mOK\x1b[0m ] '\x1B[4m\x1B[94m\x1B[4m" + a_libName + "\x1b[0m' loaded successfully." );				// console.log( "[ " + "OK".green.inverse + " ]\t'" + a_libName.bBlue.underline + "' loaded successfully." );
	if ( a_log ) console.log( "\t" + a_log );
	return _rtn;
}

const start = async () => {
	console.log( "\x1B[97m=============================================================================\x1b[0m" );
	await asyncRequire( './js/colors.js' );					// 加载控制台色彩模块
	await asyncRequire( './lib/genFuncs' );					// 加载通用函数库
	global.fs = await asyncRequire( 'fs' );					// ■ 加载 fs 模块
	global.path = await asyncRequire( 'path' );				// ■ 加载 path 模块
	
	global.iniResult = await asyncRequire( './conf/transfer_ini.json' );		// 加载配置文件
	global.debug = iniResult[ "debug" ] || false;			// debug 状态
	global.svrState = 1;				// 服务器工作状态值
	
	global.imgsDir = path.join( __dirname, iniResult[ "imgsDir" ] || "/imgsTemp" );						// 创建图片保存目录
	if ( funcs.mkdirsSync( imgsDir ) ) { console.log( "[ " + "OK".green.inverse + " ]" + " Image directory created successfully:\n\t".bBlue + imgsDir.green.underline ); }
	else { process.exit(1); }
	
	global.fastify = await asyncRequire( 'fastify', { logger: false } );
	await fastify.register( require( 'fastify-static' ), { root: path.join( __dirname, iniResult[ "static" ] ), prefix: iniResult[ "static" ] /*, optional: default '/'*/ } );
	console.log( "[ " + "OK".green.inverse + " ]" + " Static route service is registered to 'fastify'.\n\t".bBlue + 'Path : ' + ( "'" + iniResult[ "static" ] + "'" ).green.inverse );
	await fastify.register( require( './routes/transfer.js' ) );				// Register routes
	// Health check route
	fastify.get('/', async ( request, options, reply ) => {
		console.log( " GET ".cyan.inverse + " --> " + "'/'".green.inverse + ' @' + ( new Date() ).toLocaleString().magenta );
		return { "version":"0.0.1", "mothed":"GET" };
	});
	try {
		await fastify.listen( process.env.PORT || 3000, funcs.getIPAdress() );
		fastify.log.info( `server listening on ${fastify.server.address().port}` );
		console.log( "[ " + "OK".green.inverse + " ]" + ' Transfer Svr listening on '.bBlue + "(" + fastify.server.address().family.underline + ")" + fastify.server.address().address.cyan.inverse + ":" + ( fastify.server.address().port + "" ).yellow.inverse + ' @' + funcs.now().magenta );
		console.log( "\t'Debug'\t: " + ( debug ? funcs.true : funcs.false ) );
		console.log( "\t'State'\t: " + ( svrState == 1 ? funcs.true : funcs.false ) );
	} catch ( err ) {
		console.log( "[ " + "FAIL".error.inverse + " ]" + ' Transfer Svr startup failed.'.red );
		console.error( err );			// fastify.log.error( err );
		console.log( "-----------------------------------------------------------------------------".error );
		process.exit(1);
	}
	await asyncRequire( './js/readline.js', null, "Enter the '" + "help".white.underline + "' command to get the command list." );			// 加载行命令模块 './js/readline.js'
	console.log( "-----------------------------------------------------------------------------".bBlue );
	global.rl.setPrompt( global.defaultPrompt );
	global.rl.prompt();
}

start();			// 启动

