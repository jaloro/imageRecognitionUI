async function asyncRequire( a_libName, a_opts = null, a_log = null ) {
	let _rtn;
	try {
		if ( !a_opts ) _rtn = await require( a_libName );						// 加载无参数模块
		else _rtn = await require( a_libName )( a_opts );						// 加载带参数模块
	} catch ( e ) {
		console.log( "[ \x1B[30m\x1B[41mFAIL\x1B[0m ]'\x1B[4m\x1B[91m\x1B[4m" + a_libName + "\x1B[0m' Modular loading failed." );					// \x1B[0m 效果终止符
		// console.log( "\t\x1B[4m" + e.message + "\x1B[0m");
		console.log( "\x1B[31m\-----------------------------------------------------------------------------\nexit\x1B[0m" );
		process.exit( 1 );
	}
	console.log( "[ \x1B[30m\x1B[42mOK\x1B[0m ] '\x1B[4m\x1B[34m\x1B[4m" + a_libName + "\x1B[0m'" + ( a_libName.length > 50 ? "\n\t" : " " ) + "\x1B[92mModular loaded successfully.\x1B[0m" );			// console.log( "[ " + "OK".green.inverse + " ]\t'" + a_libName.bBlue.underline + "' loaded successfully." );
	if ( a_log ) console.log( "\t" + a_log );
	return _rtn;
}

const start = async () => {
	console.log( "\x1B[97m=============================================================================\x1B[0m" );
	await asyncRequire( './js/colors.js' );					// 加载控制台色彩模块
	await asyncRequire( './lib/genFuncs' );					// 加载通用函数库
	global.fs = await asyncRequire( 'fs' );					// ■ 加载 fs 模块
	global.path = await asyncRequire( 'path' );				// ■ 加载 path 模块
	
	global.iniFile = path.resolve( __dirname, './conf/transfer_ini.json' );		// *注:可以使用"./"或者直接后续目录路径，不能使用"/"，因为"/"会被理解为根目录，导致前段路径被忽略
	global.iniResult = await asyncRequire( iniFile );		// 加载配置文件 *注：require 加载文件时，是相对当前文件的位置的，所以 "./" 和 __dirname 效果相同
	global.debug = iniResult[ "debug" ] || false;			// debug 状态
	global.svrState = 1;				// 服务器工作状态值
	
	global.imgsDir = path.join( __dirname, iniResult[ "imgsDir" ] || "/imgsTemp" );						// 创建图片保存目录
	if ( funcs.mkdirsSync( imgsDir ) ) { console.log( "[ " + "OK".green.inverse + " ]" + " Image directory created successfully:\n\t".bBlue + imgsDir.underline ); }
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

