global.iniFile = './conf/transfer_ini.json';
require( './js/colors.js' );						// 加载控制台色彩模块
global.fs = require( "fs" );						// ■ 加载 fs 模块
global.path = require( 'path' );					// ■ 加载 path 模块
global.funcs = require( './lib/genFuncs' );			// 加载通用函数库
// Require the framework and instantiate it
const fastify = require('fastify')({
	logger: false
});
global.fastify = fastify;
// console.log(__dirname);
// console.log("blue".blue, "bBlue".bBlue, "cyan".cyan, "bCyan".bCyan, "green".green, "bGreen".bGreen, "white".white );
console.log( "=============================================================================".cyan );
try {
	global.iniResult = require( iniFile );			// 加载配置文件
} catch ( err ) {
	console.log( "[ " + "FAIL".error.inverse + " ]" + "\tFailed to reload configuration file.".error );
	console.error( err );
	console.log( "-----------------------------------------------------------------------------".error );
	process.exit( 1 );
}
console.log( "[ " + "OK".green.inverse + " ]" + " Load and parse configuration file successfully.".cyan );
console.log( "\tFile : " + ( "'" + iniFile + "'" ).green.inverse );
global.debug = iniResult[ "debug" ] || false;						// debug 状态
global.svrState = 1;					// 服务器工作状态值

global.imgsDir = path.join( __dirname, iniResult[ "imgsDir" ] || "/imgsTemp" );						// 图片保存位置
fs.mkdir( imgsDir, { recursive: true }, function( err ){		// 把 __dirname 修改为 "./" 即 node 启动的位置
	if ( err ) {
		console.log( "[ " + "FAIL".error.inverse + " ]" + ' Failed to create image directory.'.red );
		console.error( err );
		console.log( "-----------------------------------------------------------------------------".error );
		process.exit( 1 );
	}
	console.log( "[ " + "OK".green.inverse + " ]" + " Image directory created successfully:\n\t".cyan + imgsDir.green.inverse );		// path.resolve( "./", imgsDir )
	require( './js/readline.js' );					// 加载行命令模块 './js/readline.js'
	// Register routes
	fastify.register(require('fastify-static'), {
		root: path.join( __dirname, iniResult[ "static" ] ),
		prefix: iniResult[ "static" ], // optional: default '/'
		// prefix: '/public/', // optional: default '/'
	});
	console.log( "[ " + "OK".green.inverse + " ]" + ' Static route service is up.\n\t'.cyan + 'Path : ' + ( "'" + iniResult[ "static" ] + "'" ).green.inverse );
	fastify.register(require('./routes/transfer.js'));
	start();	// Run the server!
} );

// Health check route
fastify.get('/', async ( request, options, reply ) => {
	console.log( " GET ".cyan.inverse + " --> " + "'/'".green.inverse + ' @' + ( new Date() ).toLocaleString().magenta );
	return { "version":"0.0.1", "mothed":"GET" };
});

const start = async () => {		// Run the server!
	try {
		await fastify.listen( process.env.PORT || 3000, getIPAdress() );
		fastify.log.info(`server listening on ${fastify.server.address().port}`);
		console.log( "[ " + "OK".green.inverse + " ]" + ' Transfer Svr listening on '.cyan + "(" + fastify.server.address().family + ")" + fastify.server.address().address.cyan.underline + ":" + ( fastify.server.address().port + "" ).yellow.underline + ' @' + funcs.now().magenta );
		// funcs.print( "[ " + "OK".green.inverse + " ]" + ' Res svr listening on '.cyan + "(" + fastify.server.address().family + ")" + fastify.server.address().address.cyan.inverse + ":" + ( fastify.server.address().port + "" ).yellow.inverse + ' @' + funcs.timeNow().magenta );
		console.log( "\t'Debug'\t: " + ( debug ? funcs.true : funcs.false ) );
		console.log( "\t'State'\t: " + ( svrState == 1 ? funcs.true : funcs.false ) );
		console.log( "-----------------------------------------------------------------------------".cyan );
		global.rl.setPrompt( global.defaultPrompt );
		global.rl.prompt();
	} catch ( err ) {
		// fastify.log.error( err );
		console.log( "[ " + "FAIL".error.inverse + " ]" + ' Transfer Svr startup failed.'.red );
		console.error( err );
		console.log( "-----------------------------------------------------------------------------".error );
		process.exit(1);
	}
}

// 【 定义函数 】 - 获取本机电脑IP
function getIPAdress() {
	let interfaces = require('os').networkInterfaces();
	for ( var devName in interfaces ) {
		var iface = interfaces[ devName ];
		for ( var i = 0; i < iface.length; i++ ) {
			let alias = iface[ i ];
			if ( alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal ) {
				return alias.address;
			}
		}
	}
}

// console.log(require('os').cpus().length);