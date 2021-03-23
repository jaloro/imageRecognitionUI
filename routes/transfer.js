// const iconv = require('iconv-lite');						// 用于编码转换的库
const http = require('http');
const formData = require('form-data');						// import * as formData from 'form-data'; 用于 post 提交表格参数
const { stringify } = require('querystring');
const sharp = require('sharp');

let showResponse = iniResult[ "showResponse" ] || true;							// 是否显示转发后的结果值
let serverRoute = iniResult[ "serverRoute" ] || "/";							// 服务器路径
// let imgsDir = iniResult[ "imgsDir" ] || "./imgsTemp/";							// 文件暂存目录
let proxyHost = iniResult[ "proxyHost" ] || "127.0.0.1";						// 需要转发的目标服务器地址
let proxyPort = iniResult[ "proxyPort" ] || 8000;								// 需要转发的目标服务器端口号
let proxyRoute = iniResult[ "proxyRoute" ] || "/";								// 需要转发的目标服务器路径
let corsOption = iniResult[ "corsOption" ] || "*";								// 跨域参数
let imgNumLmt = iniResult[ "imgNumLmt" ] || 0;									// 转发图片数量限制

// 获取唯一文件名函数 ---------------------------------------- < Function >
let _uufnIndex = 0;
function uufn(){
	let _uufn = '';
	if ( ++_uufnIndex > 10000 ) _uufnIndex = 0;
	_uufn = _uufn + parseInt( Date.now() ) + "-" + _uufnIndex;
	// _uufn = _uufn + funcs.getTimestamp() + "-" + _uufnIndex;
	return _uufn;
}

// 根据文件头信息返回文件真实 mimetype 值, 支持格式: jpg gif png webp jfif bmp 
function getMimeTypeByRealFormat( a_fileHeader ) {
	// console.log( "\t - header info: ", a_fileHeader );
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'utf-8' ) );
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'hex' ).toString( 'hex' ) );
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'hex' ).toString( 'utf-8' ) );

	if ( a_fileHeader == "" ) return "";

	if ( a_fileHeader == "89504E470D0A1A0A" ) return "image/png";
	let _subHeader_4 = a_fileHeader.substr( 0, 4 );
	if ( _subHeader_4 == "ffd8" ) return "image/jpeg";			// .jfif .jpg 文件的头文件一致
	if ( _subHeader_4 == "424d" ) return "image/bmp";			// '424d' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'BM'
	if ( _subHeader_4 == "4949" || a_fileHeader.substr( 0, 4 ) == "4d4d" ) return "image/tiff";		// '4949' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'II'，'4d4d' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'MM'
	
	let _subHeader_6 = a_fileHeader.substr( 0, 6 );
	if ( _subHeader_6 == "000002" ) return "mage/x-tga";

	let _fileHeaderUtf8 = Buffer.from( a_fileHeader, 'hex' ).toString( 'utf-8' );					// 把头信息字符串用 16 进制还原到 buffer 数据；再把还原的 buffer 数据用 utf-8 编码成字符串； Buffer.from 的常用编码参数有：hex utf-8 ascii base64
	// console.log( '\t', _fileHeaderUtf8.length, _fileHeaderUtf8.green, funcs.typeofByName( _buf ) );
	if ( _fileHeaderUtf8.substr( 0, 6 ) == 'GIF89a' || _fileHeaderUtf8.substr( 0, 6 ) == 'GIF87a' ) return "image/gif";
	if ( _fileHeaderUtf8.substr( 0, 4 ) == 'RIFF' ) { if ( _fileHeaderUtf8.substr( 8, 4 ) == 'WEBP' ) { return "image/webp"; } }			// *注：.webp 格式的头信息为 utf-8 编码，第一个 4 bytes 是字符 'RIFF'(位置为 1-4 ); 第二个 4 bytes 是文件大小，占4个字符位置，有可能存在不可见字符(位置为 5-8 ); 第三个 4 bytes 是字符 'WEBP'(位置为 9-12 )

	return "unkown";
}

// 根据文件 mimetype 得到建议的扩展名
function getExtByMimeType( a_mimetype = "" ) {
	if ( a_mimetype == "" ) return "";
	let _indexTable = { "image/jpeg":".jpg", "image/png":".png", "image/gif":".gif", "image/webp":".webp" };
	return _indexTable[ a_mimetype ] || "";
}

// 转换图片文件格式到 jpg 格式；（ *注：此函数已改良，原始的方法移至文件尾部，这两个方法都解决了转换的原始文件被锁死导致可能的内存泄漏问题 ）
async function convertToJpg ( a_inFile, a_outFile, a_quality = 75 ) {
	return new Promise( ( resolve, reject ) => {
		let _outputStream = fs.createWriteStream( a_outFile );					// 建立转换写入流， *注：写入流没有监测到 end 事件，需要监测 close 事件
		_outputStream.on( 'close', () => {
			console.log( "\tConversion of image to 'JPG' format succeeded.".bGreen );
			resolve( { success: true } );
		});					// finish 事件先于 close 事件发生
		fs.createReadStream( a_inFile ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.1 ..." ), reject( e ); } } ).pipe( sharp().jpeg( { quality: a_quality } ) ).on( 'error', ( e ) => { if ( e ) { reject( e ); } } ).pipe( _outputStream ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.2 ..." ), reject( e ); } } ); 			// *注：读取流可以监测到 end 和 close 事件；写入流没有监测到 end 事件，只能监测 close 事件
	});
};

// 管道错误处理函数 ------------------------------------------ < Function >
function handlePipeError( err, a_msg = "" ) {
	console.log( err );
	console.log( a_msg.error );
	if ( rl ) {
		rl.setPrompt( defaultPrompt );
		rl.prompt();
	}
}

// async function proxy( fastify, options, next ) {
module.exports = async function ( fastify, options, next ) {
	// [ POST ] ================================================================================================================================================
	console.log( "[ " + "OK".green.inverse + " ]" + ( " Transfer '" + "POST".inverse + "' service is up." ).cyan );
	console.log( "\tServer Route\t: " + ( "'" + serverRoute + "'" ).green );
	console.log( "\tProxy Host\t: " + proxyHost.cyan );
	console.log( "\tProxy Port\t: " + ( proxyPort + '' ).yellow );
	console.log( "\tProxy Route\t: " + ( "'" + proxyRoute + "'" ).green );
	// Register plugins
	fastify.register(require('fastify-multipart'),{	addToBody:false });			// 用中间件设置允许多文件格式传输
	fastify.register(require('fastify-cors'), { origin:corsOption });			// 用中间件设置跨域参数，本例中为允许一切访问
	fastify.post( serverRoute, async ( req, reply ) => {
		console.log( " POST ".cyan.inverse + " --> " + ( "'" + serverRoute + "'" ).green.inverse + ' @' + ( new Date() ).toLocaleString().magenta );
		// req.log.info('some info');
		console.log( "\t 'POST' datas ".gray.inverse );
		// 从 POST 中提取数据 ===================================================================================
		let _parts;
		try {
			_parts = await req.parts();											// 多文件（或值对）处理 ============================== 	// 获取单个图片文件数据 _part = await req.file(); console.log( _part.filename );
			console.log( '\t---------------------------------------------------------------------'.green );
		} catch ( err ) {
			// _res = { "statusCode":406, "version":"0.0.1", "code":"FST_INVALID_MULTIPART_CONTENT_TYPE", "method":"POST", "time":funcs.now(), "error":"Not Acceptable", "message": "the request is not multipart" };
			console.log( '\t---------------------------------------------------------------------'.red );
		}
		const _transferFormData = new formData();								// 定义 form 对象【流？】，用于发送 post 请求
		let _files = [];
		try {
			for await ( const _part of _parts ) {
				if ( _part.file ) {
					let _orgExt = path.extname( _part.filename );
					let _file =  { "orgPathName":path.resolve( imgsDir, uufn() + _orgExt ), "orgExt":_orgExt, "orgMime":_part.mimetype, "SOI":"" };				// path.resolve( "./", imgsDir )
					// funcs.printObject( _file, 0, "\t" );
					console.log( "\t- " + "<file> ".cyan + _part.fieldname.underline + ": " + _part.filename.green );
					if ( _part.filename == '' ) {								// 处理空文件型参数
						await _part.file.on( 'error', ( e ) => { handlePipeError( e, "\t1.1 pipe @empty file in parts" ) } ).pipe( fs.createWriteStream( _file[ "orgPathName" ] ) ).on( 'error', ( e ) => { handlePipeError( e, "\t1.2 pipe empty @saveing..." ) } );			// 把POST中的图像数据保存到文件。*注：如果不需要保存文件或者不需要处理文件等参数，可以直接向 formData 中append
						continue;
					}
					_files.push( _file );
					_part.file.on( 'data', ( chunk ) => {						// 从 POST 流中获得数据时触发，默认 chunk 的大小为64K(65536)
						if ( _file[ "SOI" ] == "" ) {							// 在第一次 data 事件中检测文件头信息
							_file[ "SOI" ] = chunk.slice( 0, 16 ).toString( 'hex' );				// 把文件头信息的前 16 bytes 用 16 进制转化成字符，*注：默认情况下，toString() 函数使用 'utf-8' 编码进行转换，即每2个 bytes 转换成一个字符
							_file[ "realMime" ] = getMimeTypeByRealFormat( _file[ "SOI" ] );		// 根据头信息获取真实文件格式
							// console.log( '\t', _file[ "orgMime" ].red, _file[ "realMime" ].cyan );
							if ( _file[ "realMime" ] == "unkown" || _file[ "realMime" ] == "" ) _file[ "realMime" ] = _file[ "orgMime" ];
							if ( _file[ "orgMime" ] != _file[ "realMime" ] ) {
								_file[ "realPathName" ] = _file[ "orgPathName" ].replace( _file[ "orgExt" ], getExtByMimeType( _file[ "realMime" ] ) );
								_file[ "realExt" ] = getExtByMimeType( _file[ "realMime" ] );
							} else {
								_file[ "realPathName" ] = _file[ "orgPathName" ];
								_file[ "realExt" ] = _file[ "orgExt" ];
							}
						}
					});
					_part.file.on( 'end', () => {								// 从 POST 流中读取某个 FILE 类型参数结束时触发 ---> 查看文件真实格式是否正确，不正确则修改文件的扩展名；
						if ( _file[ "orgMime" ] != _file[ "realMime" ] ) {		// 如果真实文件格式与原始文件格式不符，修改文件的扩展名
							fs.renameSync( _file[ "orgPathName" ], _file[ "realPathName" ] );
						}
					});
					await _part.file.on( 'error', ( e ) => { handlePipeError( e, "\t2.1 pipe @file in parts" ); } ).pipe( fs.createWriteStream( _file[ "orgPathName" ] ) ).on( 'error', ( e ) => { handlePipeError( e, "\t2.2 pipe @saveing..." ); } );	// 把POST中的图像数据保存到文件
				} else {
					console.log( "\t- " + "<value> ".green + _part.fieldname.underline + ": " + _part.value );
					_transferFormData.append( _part.fieldname, _part.value );
				}
			}
		} catch ( err ) {
			console.log( '\t---------------------------------------------------------------------'.red.inverse );
			console.log( '\tFST_INVALID_MULTIPART_CONTENT_TYPE'.red );
			// _res = { "statusCode":406, "version":"0.0.1", "code":"FST_INVALID_MULTIPART_CONTENT_TYPE", "method":"POST", "time":funcs.now(), "error":"Not Acceptable", "message": "the request is not multipart" };
			// reply.send( res );
			// return;
		}
		// 修正文件数据格式: 如 .webp ===================================================================================
		console.log( "\tConvert...".underline );
		if ( _files.length > 0 ) {
			for ( let _i = 0; _i < _files.length; _i ++ ) {						// 转换后台无法处理的图片格式到 jpg 格式
				if ( _files[ _i ][ "realMime" ] == "image/webp" ) {
					let _newPathName = path.resolve( _files[ _i ][ "realPathName" ].replace( _files[ _i ][ "realExt" ], '.jpg') );
					await convertToJpg( _files[ _i ][ "realPathName" ], _newPathName );				// 转换图像到 jpg 格式（ Promise ）
					_files[ _i ][ "realPathName" ] = _newPathName;
					break;				// 限制只处理第一张图片
				} else if ( _files[ _i ][ "realMime" ].substr( 0, 5 ) == "image" || _files[ _i ][ "realMime" ].substr( 0, 5 ) == "mage/") {
					break;				// 监测到不需要转换格式的图片文件，则跳出；
				} else {
					continue;			// 非图片格式文件，跳过
				}
			}
		}
		
		// 填充文件数据到 form 对象中 ===================================================================================
		// let _filesNum = ( ( imgNumLmt < 1 || imgNumLmt > _files.length ) ? _files.length : imgNumLmt );				// 在完整转发项目中，如果把 _filesNum 设为 1，则表示只转发一个文件。 *注：此句因为在下方的 _files[] 循环体中已经加了首图片文件限制而屏蔽
		if ( _files.length > 0 ) {				// 填充 request 的 POST 请求中的 formdata 中的 文件参数
			// for ( let _i = 0; _i < _filesNum; _i ++ )
			for ( let _i = 0; _i < _files.length; _i ++ )
			{
				if ( _files[ _i ][ "realMime" ].substr( 0, 6 ) == "image/" ) {						// 根据本例实际需求，改为添加一个图片类型的文件即可，即只往AI识别后台发送一张图片
					// try {
						_transferFormData.append( 'file', fs.createReadStream( _files[ _i ][ "realPathName" ] ).on( 'error', ( e ) => { handlePipeError( e, "\t4.1 pipi @append readStream..." ); } ) );		// *注：输出流可以监听 data, end, close, finish 事件
						break;			// 限制只 POST 第一张图片
					// } catch ( err ) {
					// 	console.log( err );
					// }
				} else {
					continue;
				}
			}
		}
		// 提交 form 对象到后台 ===================================================================================
		let _query = stringify( req.query );
		console.log( "\tTransfering...".underline );
		const _transferRequest = http.request(				// import { request } from 'http';	// 创建一个 'http.request' 对象 【流？】
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
		_transferFormData.on( 'error', ( e ) => { handlePipeError( e, "\t5.1 pipe @post local..." ) } ).pipe( _transferRequest ).on( 'error', ( e ) => { handlePipeError( e, "\t5.2 pipe @post URL..." ) } );							// 向 AI 后端发送 POST 图像数据：把 _transferFormData 流通过管道(pipe)流向 reqRroxy 流
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
	
	
// // 二进制缓存16进制读取函数 ---------------------------------- < Function >
// function readUInt16( buffer, offset, bigEndian ) {
//     if ( buffer.readUInt16 ) {
//         return buffer.readUInt16( offset, bigEndian );
//     }
//     var value;
//     if ( bigEndian ) {
//         if ( buffer.readUInt16BE ) {
//             return buffer.readUInt16BE( offset );
//         }
//         value = ( buffer[ offset ] << 8 ) + buffer[ offset + 1 ];
//     }
//     else {
//         if ( buffer.readUInt16LE ) {
//             return buffer.readUInt16LE( offset );
//         }
//         value = buffer[ offset ] + ( buffer[ offset + 1 ] << 8 );
//     }
//     return value;
// }

// sharp( _files[ _i ][ "realPathName" ] )				// 直接使用 sharp 此写法目前存在转换的原文件被锁住不释放的问题，改用 promise 并先将图片读到buffer中再进行处理来暂时解决问题；
// 	.jpeg( { quality: 75 } )
// 	.toFile( _newPathName )
// 	.then( ( info ) => {
// 		funcs.printObject( info, 0, "\t" );
// 	})
// 	.catch ( ( err ) => { console.log( err ); } );

// 转换图片文件格式到 jpg 格式； （ 原始函数 ）
// const convertToJpg = ( a_inFile, a_outFile, a_quality = 75 ) => {
// 	return new Promise( ( resolve, reject ) => {
// 		let _stream = fs.createReadStream( a_inFile );
// 		let _fileData = [];						// 存储文件流 chunk 的数组
// 		let _totalLength = 0;
// 		_stream.on( 'data', ( chunk ) => {		// *注：data 事件触发几次，_fileData 就会被 push 几次，_fileData 中存放的是 data 事件的 chunk 块数据；
// 			_fileData.push( chunk );
// 			console.log( _fileData[ 0 ].length, chunk.length );
// 			_totalLength += chunk.length;
// 		});
// 		_stream.on( 'end', function() {
// 			console.log( "end", _totalLength );
// 			let _finalData = Buffer.concat( _fileData, _totalLength );
// 			sharp( _finalData )
// 			.jpeg( { quality: a_quality } )
// 			.toFile( a_outFile, ( err ) => {
// 				if( err ){
// 					reject( err );
// 				}
// 				resolve( { success: true } );
// 			});
// 			// .then( ( info ) => {
// 			// 	funcs.printObject( info, 0, "\t" );
// 			//  	})
// 			// .catch ( ( err ) => { console.log( err ); } );
// 		});
// 	});
// };
// 下方代码可实现文件格式转换，但有异步问题
// ===================================================================================================================================================
// let _inputStream = fs.createReadStream( _files[ _i ][ "realPathName" ] );
// let _outputStream = fs.createWriteStream( _newPathName );
// let _converter = sharp()
// 	.jpeg( { quality: 75 } );
// console.log( 'ready for convert pipe' );
// await sync _inputStream.on( 'error', ( e ) => { handlePipeError( e, "pipi @convert inputStream..." ); } ).pipe( _converter ).on( 'error', ( e ) => { handlePipeError( e, "pipi @ converting..." ); } ).pipe( _outputStream ).on( 'end', () => { handlePipeError( e, "pipi @convert outputStream..." ); } ); 	// 此段代码本身没有问题，但是会触发异步问题，导致后续无法获取 readStream 数据
