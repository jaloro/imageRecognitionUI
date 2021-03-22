// const funcs = require('../lib/genFuncs');
// const colors = require('colors');
const http = require('http');
const imageinfo = require('imageinfo');
const formData = require('form-data');			// import * as formData from 'form-data'; 用于 post 提交表格参数
const { stringify } = require('querystring');
const sharp = require('sharp');
// const util = require("util");
// const { pipeline } = require('stream');
// const pump = util.promisify(pipeline);

let showResponse = iniResult[ "showResponse" ] || true;					// 是否显示转发后的结果值
let serverRoute = iniResult[ "serverRoute" ] || "/";					// 服务器路径
let imgsDir = iniResult[ "imgsDir" ] || "./imgsTemp/";					// 文件暂存目录
let proxyHost = iniResult[ "proxyHost" ] || "127.0.0.1";				// 需要转发的目标服务器地址
let proxyPort = iniResult[ "proxyPort" ] || 8000;						// 需要转发的目标服务器端口号
let proxyRoute = iniResult[ "proxyRoute" ] || "/";						// 需要转发的目标服务器路径
let corsOption = iniResult[ "corsOption" ] || "*";						// 跨域参数
let imgNumLmt = iniResult[ "imgNumLmt" ] || 0;							// 转发图片数量限制

let _uufnIndex = 0;
// 获取唯一文件名函数 ---------------------------------------- < Function >
function uufn(){
	let _uufn = '';
	if ( ++_uufnIndex > 10000 ) _uufnIndex = 0;
	_uufn = _uufn + parseInt( Date.now() ) + "-" + _uufnIndex;
	// _uufn = _uufn + funcs.getTimestamp() + "-" + _uufnIndex;
	return _uufn;
}

function handlePipeError( err ) {
	console.log( err );
}

// async function proxy( fastify, options, next ) {
module.exports = async function ( fastify, options, next ) {
	// [ POST ] ================================================================================================================================================
	console.log( "[" + "OK".green.inverse + "]" + ( " Transfer '" + "POST".inverse + "' service is up." ).cyan );
	console.log( "\tServer Route\t: " + ( "'" + serverRoute + "'" ).green );
	console.log( "\tProxy Host\t: " + proxyHost.cyan );
	console.log( "\tProxy Port\t: " + ( proxyPort + '' ).yellow );
	console.log( "\tProxy Route\t: " + ( "'" + proxyRoute + "'" ).green );
	// Register plugins
	fastify.register(require('fastify-multipart'),{	addToBody:false });		// 用中间件设置允许多文件格式传输
	fastify.register(require('fastify-cors'), { origin:corsOption });		// 用中间件设置跨域参数，本例中为允许一切访问
	fastify.post( serverRoute, async ( req, reply ) => {
		console.log( " POST ".cyan.inverse + " --> " + ( "'" + serverRoute + "'" ).green.inverse + ' @' + ( new Date() ).toLocaleString().magenta );
		// req.log.info('some info');
		console.log( "\t 'POST' datas ".gray.inverse );
		try {
			const _parts = await req.parts();							// 多文件（或值对）处理 ============================== 	// 获取单个图片文件数据 _part = await req.file(); console.log( _part.filename );
			const _transferFormData = new formData();							// 定义 form 对象【流？】，用于发送 post 请求
			let _files = [];
			let _newFilePathName = '';
			// let _newFilePathName_bak = '';
			for await ( const _part of _parts ) {
				if ( _part.file ) {
					_newFilePathName = path.resolve( "./", imgsDir ) + "/" + uufn() + path.extname( _part.filename );
					// _newFilePathName_bak = path.resolve( "./", imgsDir ) + "/bak_" + uufn() + path.extname( _part.filename );
					_files.push( { "pathName":_newFilePathName, "extname":path.extname( _part.filename ) } );
					// _files.push( _newFilePathName );
					console.log( "\t- " + "<file> ".cyan + _part.fieldname + ": " + ( "'" + _part.filename + "'" ).green );
					const _saveStream = fs.createWriteStream( _newFilePathName );
					// _saveStream.on( 'close', () => {
					// 	console.log( "\tstreamEvent.close" );
					// });
					// _saveStream.on( 'finish', ( data ) => {
					// 	console.log( "\tstreamEvent.finish" );
					// });
					_part.file.on( 'data', ( data ) => {
						console.log( "\tfile.on.data", _part.filename );
						
					});
					await _part.file.on( 'error', ( e ) => { handlePipeError( e ) } ).pipe( _saveStream ).on( 'error', ( e ) => { handlePipeError( e ) } );	// 把POST中的图像数据保存到文件
					// await _part.file.on( 'error', ( e ) => { handlePipeError( e ) } ).pipe( fs.createWriteStream( _newFilePathName_bak ) ).on( 'error', ( e ) => { handlePipeError( e ) } );	// 把POST中的图像数据保存到文件
					console.log( "\t\tmimetype: " + _part.mimetype.cyan );
				}
				else {
					console.log( "\t- " + "<value> ".green + _part.fieldname + ": " + _part.value );
					_transferFormData.append( _part.fieldname, _part.value );
				}
			}
			
			let _filesNum = ( ( imgNumLmt < 1 || imgNumLmt > _files.length ) ? _files.length : imgNumLmt );		// 如果把 _filesNum 设为 1，则表示只转发一个文件
			
			// if ( _files.length > 0 ) {				// 转换图像格式
			// 	for ( let _i = 0; _i < _filesNum; _i ++ ) {
			// 		if ( _files[ _i ][ "extname" ] == ".webp" ) {
			// 			const _readStream = fs.createReadStream( _files[ _i ][ "pathName" ] );
			// 			console.log( "\twebp file:" + _files[ _i ][ "pathName" ].green );
			// 			let _newPathName = path.resolve( _files[ _i ][ "pathName" ].replace('.webp','.jpg') );
			// 			console.log( "\tnew file:" + _newPathName.green );
			// 			_files[ _i ][ "pathName" ] = _newPathName;
			// 			sharp( './imgsTemp/1615502901499-2.webp' )
			// 			.jpeg( { quality: 75 } )
			// 			.toFile( "./imgsTemp/test.jpg" )
			// 			.then( ( info ) => { console.log( info ); console.log( _i, "info" ) } ).catch ( ( err ) => { console.log( err ); } );
			// 		}
			// 	}
			// }
			// console.log( '\t---------------------------------------------------------------------'.red );
			// return;
			if ( _files.length > 0 ) {				// 填充 request 的 POST 请求中的 formdata 中的 文件参数
				for ( let _i = 0; _i < _filesNum; _i ++ )
				{
					try {
						const _readStream = fs.createReadStream( _files[ _i ][ "pathName" ] );
						// _readStream.on( 'data', ( data ) => {
						// 	console.log( "\tstreamEvent.data" );
						// });
						// _readStream.on( 'end', () => {
						// 	console.log( "\tstreamEvent.end" );
						// });
						// _readStream.on( 'close', () => {
						// 	console.log( "\tstreamEvent.close" );
						// });
						_transferFormData.append( 'file', _readStream.on( 'error', ( e ) => { handlePipeError( e ) } ) );
					} catch ( err ) {
						console.log( err );
					}
				}
			}
			
			let _query = stringify( req.query );
			const _transferRequest = http.request(						// import { request } from 'http';	// 创建一个 'http.request' 对象 【流？】
				{
					host: proxyHost,
					port: proxyPort,
					path: proxyRoute + ( _query == '' ? '' : ( "?" + _query ) ),
					method: 'POST',
					headers: _transferFormData.getHeaders(),
				},
				( res ) => {
					// res.writeHead( 200, {'Content-Type': 'text/json;charset=utf-8','Access-Control-Allow-Origin':'*'} );
					// res.setHeader( 'Access-Control-Allow-Origin', '*' );
					if ( debug ) { console.log( "\t Response ".grey.inverse + " <-- @" + funcs.now().magenta ); }
					res.on( "end", () => {
						if ( debug ) { console.log( "\tRes.end - " + "End of receiving response data.".cyan ); }
						console.log( '\t---------------------------------------------------------------------'.grey );		// 灰色分割线
						if ( global.rl )
						{
							global.rl.setPrompt( global.defaultPrompt );
							global.rl.prompt();
						}
					} );
					if ( showResponse ) {
						if ( debug ) {
							console.log( "\tRes - " + "Code: ".cyan, res.statusCode );
							// console.log( res );
							// funcs.printObject( res, 1, "\t" );
						}	// 200
					}
					reply.send( res );
				}
			);
			// _transferFormData.on( 'end', () => {
			// 	if ( debug ) { console.log( '_transferFormData: ' + 'Sending post data through pipe ends.'.cyan ); }
			// });
			// _transferRequest.on( 'finish', () => {
			// 	if ( debug ) { console.log( '_transferRequest: ' + 'Sending post data through pipe ends.'.cyan ); }
			// });
			_transferFormData.on( 'error', ( e ) => { handlePipeError( e ) } ).pipe( _transferRequest ).on( 'error', ( e ) => { handlePipeError( e ) } );								// 向 AI 后端发送 POST 图像数据：把 _transferFormData 流通过管道(pipe)流向 reqRroxy 流
		} catch( error ) {
			_res = { "statusCode":406, "version":"0.0.1", "code":"FST_INVALID_MULTIPART_CONTENT_TYPE", "method":"POST", "time":funcs.now(), "error":"Not Acceptable", "message": "the request is not multipart" };
		}
	});
}
// module.exports = proxy;		//routes









	// [ GET ] =================================================================================================================================================
	// fastify.get( serverRoute, ( req, reply ) => {			// fastify.get( '/', async ( req, reply ) => {
	// 	if( debug ){ funcs.print( colors.inverse( colors.cyan( " GET '/' " ) ) ); }
	// 	http.get('http://' + proxyHost + ':' + proxyPort + proxyRoute + req.raw.url, ( response ) => {
	// 		let _resData = '';
	// 		response.on('data', ( _chunk ) => {	_resData += _chunk; });			// called when a data chunk is received. // 接收转发 http 请求后返回的数据块
	// 		response.on('end', () => { reply.send( JSON.parse(_resData) ); });	// called when the complete response is received. // 接收返回数据结束，返回接收到的数据给 fastify
	// 	}).on("error", ( error ) => {	reply.send( error ); });				// 转发 http 请求时发生错误
	// });
	// fastify.get( '/time', ( req, reply ) => {		// fastify.get( '/time', async ( req, reply ) => {
	// 	if( debug ){ funcs.print( colors.inverse( colors.cyan( " GET '/time' " ) ) + colors.magenta( " @" + funcs.timeNow( new Date() ) ) ); }
	// 	reply.send( { time:funcs.timeNow(), "version":"0.0.1" } );				// return { time:funcs.timeNow(), "version":"0.0.1" };	// 返回数据的两种写法
	// });
	
	
	// 二进制流读写方式 A =====================================================================================================================================
	// var buffers = [];
	// readstrm.on('data', function(chunk) {
	// 	buffers.push(chunk);
	// });
	// readstrm.on('end', function() {
	// 	fs.writeFile('foo.png', Buffer.concat(buffers));
	// });
	
	
	////////////////////////////////////
	// 处理一个或多个文件 ( 保存到系统临时目录 )
	// const _tmpFiles = await req.saveRequestFiles();			// 保存 POST 请求中的文件型参数到系统临时目录中
	// // for ( let _n = 0; _n < 1; _n ++ ) {			// 把循环变量判断设置为: _n < _tmpFiles.length 即可处理多个文件的转发
	// for ( let _n = 0; _n < _tmpFiles.length; _n ++ ) {
	// 	console.log( _n );
	// 	const readStream = fs.createReadStream( _tmpFiles[ _n ].filepath );	// import { createReadStream } from 'fs';		// 从系统临时目录中重新读取文件数据
	// 	readStream.on( 'end', () => {
	// 		console.log( "\t@rs.end - " + _n );
	// 	});
	// 	readStream.on( 'close', () => {
	// 		console.log( "\t@rs.close - " + "No.".cyan + _n + " file read complete, bytes: ".cyan + readStream.bytesRead );
	// 		// let info = imageinfo( data );
	// 		// 	for ( let _k in _data ){
	// 		// 		console.log( _k, _data[ _k ] );
	// 		// 	}
	// 		// console.log( "Data is type:", info.mimeType );
	// 		// console.log( "  Size:", data.length, "bytes" );
	// 		// console.log( "  Dimensions:", info.width, "x", info.height );
	// 	});
	// 	_newFilePathName = path.resolve( "./", imgsDir ) + "/" + uufn() + path.extname( _tmpFiles[0].filename );	// 获得要写入文件的全路径名称
	// 	// console.log( " - " + "<file> ".cyan + _tmpFiles[ _n ].fieldname + ": " + ( "'" + _tmpFiles[ _n ].filename + "'" ).green );
	// 	readStream.pipe( fs.createWriteStream( _newFilePathName ) );
	// 	_transferFormData.append( 'file', readStream );				// 添加一个文件型参数到 formData 对象中		// _transferFormData.append( 'firstName', 'Marcin' );		// 添加其他值对参数到 formData 对象中
	// }
	
	// _data.file // stream
	// _data.fields // other parsed parts
	// _data.fieldname
	// _data.filename
	// _data.encoding
	// _data.mimetype
	// funcs.printObject( _data, 1 );