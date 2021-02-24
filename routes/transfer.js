// const funcs = require('../lib/genFuncs');
// const colors = require('colors');
const http = require('http');
const formData = require('form-data');			// import * as formData from 'form-data';
const path = require('path');
const fs = require("fs");						// ■ 加载 fs 模块
const { stringify } = require('querystring');
const util = require("util");
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);

var iniFileURL = 'conf/transfer_ini.json';	// 初始化文件路径
var iniResult;								// 初始化文件加载结果对象
//var svrState = -1;						// 服务器工作状态值

iniResult = JSON.parse( fs.readFileSync( iniFileURL ) );				// 获取配置文件 (同步调用模式)
var silence = iniResult[ "silence" ] || false;							// 服务器终端静默模式
var showResponse = iniResult[ "showResponse" ] || true;					// 是否显示转发后的结果值
var serverRoute = iniResult[ "serverRoute" ] || "/";					// 服务器路径
var imgsDir = iniResult[ "imgsDir" ] || "./imgsTemp/";					// 文件暂存目录
var proxyHost = iniResult[ "proxyHost" ] || "127.0.0.1";				// 需要转发的目标服务器地址
var proxyPort = iniResult[ "proxyPort" ] || '8000';						// 需要转发的目标服务器端口号
var proxyRoute = iniResult[ "proxyRoute" ] || "/";						// 需要转发的目标服务器路径
var corsOption = iniResult[ "corsOption" ] || "*";						// 跨域参数

// 在启动时创建文件暂存目录
fs.mkdir( path.resolve( "./", imgsDir ), { recursive: true }, function( err ){		// 把 __dirname 修改为 "./"
	if ( err ) throw err;
	console.log( '----------------------------------------------------------' );
	console.log( '\x1b[32m%s\x1b[0m', "Images directory:" );
	console.log( "    '" + path.resolve( "./", imgsDir ) + "'" );
	console.log( '\x1b[96m%s\x1b[0m', "Proxy Host: ", proxyHost );
	console.log( '\x1b[96m%s\x1b[0m', "Proxy Port: ", proxyPort );
	console.log( '\x1b[32m%s\x1b[0m', "Route: ", "'" + proxyRoute + "'" );
	console.log( '\x1b[33m%s\x1b[0m', "Transfer http server start @" + Date().toLocaleString() );
} );

var _uufnIndex = 0;
// 获取唯一文件名函数 ---------------------------------------- < Function >
function uufn(){
	let _uufn = '';
	if ( ++_uufnIndex > 10000 ) _uufnIndex = 0;
	_uufn = _uufn + parseInt( Date.now() ) + "-" + _uufnIndex;
	// _uufn = _uufn + funcs.getTimestamp() + "-" + _uufnIndex;
	return _uufn;
}

// async function proxy( fastify, options, next ) {
module.exports = async function ( fastify, options, next ) {
	// [ POST ] ================================================================================================================================================
	// Register plugins
	fastify.register(require('fastify-multipart'),{	addToBody:false });		// 用中间件设置允许多文件格式传输
	fastify.register(require('fastify-cors'), { origin:corsOption });		// 用中间件设置跨域参数，本例中为允许一切访问
	fastify.post( serverRoute, async ( req, reply ) => {
		if( silence == false ) console.log( '\x1b[96m%s\x1b[0m', " POST ['" + serverRoute + "'] ---> [" + proxyHost + ":" + proxyPort + "]" );
		// req.log.info('some info');
		// 单文件处理【 通过 fastify-multipart 直接处理req 】 ====================================================================
		let _data = {};
		let _file = '';
		try {	// 获取图片文件数据
			_data = await req.file();
		} catch ( error ) {
			if ( error instanceof fastify.multipartErrors.FilesLimitError ) {}	// handle error
			throw( error );
		}
		// funcs.printf( "fields", ( _data.fields ) ); funcs.printf( "file", typeof( _data.file ) ); funcs.printf( "_buf", typeof( _data._buf ) ); funcs.printf( Object.keys( _data ) );
		// funcs.printf( "fieldname", ( _data.fieldname ) );	funcs.printf( "filename", ( _data.filename ) );	funcs.printf( "encoding", ( _data.encoding ) );	funcs.printf( "mimetype", ( _data.mimetype ) );
		// await _data.toBuffer() // Buffer // to accumulate the file in memory! Be careful!
		try {	// 写入文件（保存图片）
			_file = path.resolve( "./", imgsDir ) + "/" + uufn() + path.extname( _data.filename );
			path.resolve( "./", imgsDir ) + "/" + uufn() + path.extname( _data.filename );
			await pump( _data.file, fs.createWriteStream( _file ) );
		} catch ( error ) {
			if (error instanceof fastify.multipartErrors.FilesLimitError) { }
			throw( error );
		}

		// 通过 'form-data' 模块，发送 post 请求
		const readStream = fs.createReadStream( _file );	// import { createReadStream } from 'fs';
		const formProxy = new formData();
		formProxy.append( 'photo', readStream );			// 添加一个文件型参数到 formData 对象中		// formProxy.append( 'firstName', 'Marcin' );		// 添加其他值对参数到 formData 对象中
		let _query = stringify( req.query );
		const reqProxy = http.request(						// import { request } from 'http';	// 创建一个 'http.request' 对象
			{
				host: proxyHost,
				port: proxyPort,
				path: proxyRoute + ( _query == '' ? '' : ( "?" + _query ) ),
				method: 'POST',
				headers: formProxy.getHeaders(),
			},
			( response ) => {
				// response.writeHead( 200, {'Content-Type': 'text/json;charset=utf-8','Access-Control-Allow-Origin':'*'} );
				// response.setHeader( 'Access-Control-Allow-Origin', '*' );
				// console.log(Object.keys(response));
				// console.log(Object.keys(response.headers));
				// if ( showResponse ) console.log( response );
				
				if ( showResponse ) console.log( '\x1b[96m%s\x1b[0m', "Res Code: ", response.statusCode ); // 200
				reply.send( response );
			}
		);
		formProxy.pipe( reqProxy );
	});
}
// module.exports = proxy;		//routes









	// [ GET ] =================================================================================================================================================
	// fastify.get( serverRoute, ( req, reply ) => {			// fastify.get( '/', async ( req, reply ) => {
	// 	if( silence == false ){ funcs.print( colors.inverse( colors.cyan( " GET '/' " ) ) ); }
	// 	http.get('http://' + proxyHost + ':' + proxyPort + proxyRoute + req.raw.url, ( response ) => {
	// 		let _resData = '';
	// 		response.on('data', ( _chunk ) => {	_resData += _chunk; });			// called when a data chunk is received. // 接收转发 http 请求后返回的数据块
	// 		response.on('end', () => { reply.send( JSON.parse(_resData) ); });	// called when the complete response is received. // 接收返回数据结束，返回接收到的数据给 fastify
	// 	}).on("error", ( error ) => {	reply.send( error ); });				// 转发 http 请求时发生错误
	// });
	// fastify.get( '/time', ( req, reply ) => {		// fastify.get( '/time', async ( req, reply ) => {
	// 	if( silence == false ){ funcs.print( colors.inverse( colors.cyan( " GET '/time' " ) ) + colors.magenta( " @" + funcs.timeNow( new Date() ) ) ); }
	// 	reply.send( { time:funcs.timeNow(), "version":"0.0.1" } );				// return { time:funcs.timeNow(), "version":"0.0.1" };	// 返回数据的两种写法
	// });