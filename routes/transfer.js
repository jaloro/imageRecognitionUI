// const iconv = require('iconv-lite');						// 用于编码转换的库
const http = require('http');
const formData = require('form-data');						// import * as formData from 'form-data'; 用于 post 提交表格参数
const { stringify } = require('querystring');				// 用于提取 URL 中的 get 字符串
const sharp = require('sharp');								// 用于图像格式转换
const sizeOf = require('image-size');						// 获取图像尺寸

let showResponse = iniResult[ "showResponse" ] || true;							// 是否显示转发后的结果值
let serverRoute = iniResult[ "serverRoute" ] || "/";							// 服务器路径
let proxyHost = iniResult[ "proxyHost" ] || "127.0.0.1";						// 需要转发的目标服务器地址
let proxyPort = iniResult[ "proxyPort" ] || 8000;								// 需要转发的目标服务器端口号
let proxyRoute = iniResult[ "proxyRoute" ] || "/";								// 需要转发的目标服务器路径
let corsOption = iniResult[ "corsOption" ] || "*";								// 跨域参数

// 获取唯一文件名函数 ---------------------------------------- < Function >
let _uufnIndex = 0;
function uufn(){
	let _uufn = '';
	if ( ++_uufnIndex > 10000 ) _uufnIndex = 0;
	_uufn = _uufn + parseInt( Date.now() ) + "-" + _uufnIndex;					// _uufn = _uufn + funcs.getTimestamp() + "-" + _uufnIndex;
	return _uufn;
}

process.on('unhandledRejection', (reason, p) => {
	// throw reason;
	console.log( reason );
});

// 根据文件头信息返回文件真实 mimetype 值, 支持格式: jpg gif png webp jfif bmp 
function getMimeTypeByRealFormat( a_fileHeader ) {
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'utf-8' ) );
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'hex' ).toString( 'hex' ) );
	// console.log( "\t - ", Buffer.from( a_fileHeader, 'hex' ).toString( 'utf-8' ) );
	if ( a_fileHeader == "" ) return "";

	if ( a_fileHeader == "89504E470D0A1A0A" ) return "image/png";
	let _subHeader_4 = a_fileHeader.substr( 0, 4 );
	if ( _subHeader_4 == "ffd8" ) return "image/jpeg";		// .jfif .jpg 文件的头文件一致
	if ( _subHeader_4 == "424d" ) return "image/bmp";		// '424d' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'BM'
	if ( _subHeader_4 == "4949" || a_fileHeader.substr( 0, 4 ) == "4d4d" ) return "image/tiff";		// '4949' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'II'，'4d4d' 按 'hex' 还原成 buffer 然后再按 utf-8 编码则得到开始两个字母为 'MM'
	
	let _subHeader_6 = a_fileHeader.substr( 0, 6 );
	if ( _subHeader_6 == "000002" ) return "mage/x-tga";

	let _fileHeaderUtf8 = Buffer.from( a_fileHeader, 'hex' ).toString( 'utf-8' );					// 把头信息字符串用 16 进制还原到 buffer 数据；再把还原的 buffer 数据用 utf-8 编码成字符串； Buffer.from 的常用编码参数有：hex utf-8 ascii base64
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
		fs.createReadStream( a_inFile ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.1 ..." ), reject( e ); } } ).pipe( sharp().jpeg( { quality: a_quality } ) ).on( 'error', ( e ) => { if ( e ) { reject( e ); } } ).pipe( _outputStream ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.2 ..." ), reject( e ); } } ); 					// *注：读取流可以监测到 end 和 close 事件；写入流没有监测到 end 事件，只能监测 close 事件
	});
}

// 调整图片尺寸
async function imageResize ( a_inFile, a_outFile, a_width, a_height ) {
	// console.log( a_inFile, a_outFile.bGreen, a_width, a_height );
	return new Promise( ( resolve, reject ) => {
		let _outputStream = fs.createWriteStream( a_outFile );					// 建立转换写入流， *注：写入流没有监测到 end 事件，需要监测 close 事件
		_outputStream.on( 'close', () => {
			console.log( "\tResize image succeeded.".bGreen );
			resolve( { success: true } );
		});					// finish 事件先于 close 事件发生
		fs.createReadStream( a_inFile ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.3 ..." ), reject( e ); } } ).pipe( sharp().resize( a_width, a_height ) ).on( 'error', ( e ) => { if ( e ) { reject( e ); } } ).pipe( _outputStream ).on( 'error', ( e ) => { if ( e ) { handlePipeError( e, "\t3.4 ..." ), reject( e ); } } ); 								// *注：读取流可以监测到 end 和 close 事件；写入流没有监测到 end 事件，只能监测 close 事件
	});
}

// 管道错误处理函数 ------------------------------------------ < Function >
function handlePipeError( err, a_msg = "" ) {
	console.log( err );
	console.log( a_msg.error );
	if ( global.rl ) {
		rl.setPrompt( defaultPrompt );
		rl.prompt();
	}
}

// async function proxy( fastify, options, next ) {
module.exports = async function ( fastify, options, next ) {
	// Register plugins
	fastify.register( require('fastify-multipart'), { addToBody:false } );		// 用中间件设置允许多文件格式传输
	fastify.register( require('fastify-cors'), { origin:corsOption } );			// 用中间件设置跨域参数，本例中为允许一切访问
	fastify.post( serverRoute, async ( req, reply ) => {
		console.log( " POST ".cyan.inverse + " --> " + ( "'" + serverRoute + "'" ).green.inverse + ' @' + ( new Date() ).toLocaleString().magenta );
		// req.log.info('some info');
		console.log( "\t 'POST' datas ".gray.inverse );
		// 从 POST 中提取数据 ===================================================================================
		let _parts;
		let _files = [];
		const _transferFormData = new formData();								// 定义 form 对象【流？】，用于发送 post 请求
		
		let receiveParts = new Promise( ( resolve, reject ) => {				// 接受 POST 参数
			try {
				_parts = req.parts();											// 多文件（或值对）处理 ============================== 	// 获取单个图片文件数据 _part = await req.file(); console.log( _part.filename );
				console.log( '\t---------------------------------------------------------------------'.green );
			} catch ( err ) {
				// _res = { "statusCode":406, "version":"0.0.1", "code":"FST_INVALID_MULTIPART_CONTENT_TYPE", "method":"POST", "time":funcs.now(), "error":"Not Acceptable", "message": "the request is not multipart" };
				console.log( '\t---------------------------------------------------------------------'.red );
				reject();
			}
			resolve();
		});
		
		let saveParts = receiveParts.then( _getPartsSuccess => {				// 保存 POST 参数，同时检查并修正扩展名
			console.log( "\tGet parts successfully.".red );
			return new Promise( async ( resolve, reject ) => {
				try {
					let _f = 1;
					for await ( const _part of _parts ) {
						if ( _part.file ) {		// 文件型参数
							let _orgExt = path.extname( _part.filename );
							let _file =  { "orgPathName":path.resolve( imgsDir, uufn() + _orgExt ), "orgExt":_orgExt, "orgMime":_part.mimetype, "SOI":"" };							// path.resolve( "./", imgsDir )
							// funcs.printObject( _file, 0, "\t" );
							console.log( "\t" + _f + ".<file> ".cyan + _part.fieldname.underline + ": " + _part.filename.cyan );
							if ( _part.filename == '' ) {						// 处理空文件型参数
								_part.file.on( 'error', ( e ) => { handlePipeError( e, "\t1.1 pipe @empty file in parts" ) } ).pipe( fs.createWriteStream( _file[ "orgPathName" ] ) ).on( 'error', ( e ) => { handlePipeError( e, "\t1.2 pipe empty @saveing..." ) } );					// 把POST中的图像数据保存到文件
								continue;
							}
							_files.push( _file );
							_part.file.on( 'data', ( chunk ) => {				// 从 POST 流中获得数据时触发，默认 chunk 的大小为64K(65536)
								if ( _file[ "SOI" ] == "" ) {					// 在第一次 data 事件中检测文件头信息
									_file[ "SOI" ] = chunk.slice( 0, 16 ).toString( 'hex' );							// 把文件头信息的前 16 bytes 用 16 进制转化成字符，*注：默认情况下，toString() 函数使用 'utf-8' 编码进行转换，即每2个 bytes 转换成一个字符
									_file[ "realMime" ] = getMimeTypeByRealFormat( _file[ "SOI" ] );					// 根据头信息获取真实文件格式
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
							_part.file.on( 'error', ( e ) => { handlePipeError( e, "\t2.1 pipe @file in parts" ); } ).pipe( fs.createWriteStream( _file[ "orgPathName" ] ) );		// 把POST中的图像数据保存到文件 .on( 'error', ( e ) => { handlePipeError( e, "\t2.2 pipe @saveing..." ); } )  .then( () => { resolve() } )
							await new Promise( ( resolve, reject ) => {			// 此处必须有 await，否则仍然是并发保存
								_part.file.on( 'end', () => {					// 从 POST 流中读取某个 FILE 类型参数结束时触发 ---> 查看文件真实格式是否正确，不正确则修改文件的扩展名；
									console.log( "\t" + _f + ".end ...".underline + " " + _part.filename.cyan );
									if ( _file[ "orgMime" ] != _file[ "realMime" ] ) {				// 如果真实文件格式与原始文件格式不符，修改文件的扩展名
										console.log( "\t" + _f + ".Modify extension ...".underline );
										fs.renameSync( _file[ "orgPathName" ], _file[ "realPathName" ] );
									}
									resolve();
								});
								
							})
							.then( _saveFileComplete => {
								console.log( "\t" + _f + ".saved ".underline + path.basename( _file[ "realPathName" ] ).cyan );
								// break;
							}, _saveFileError => {
								
							});
						} else {		// 非文件型参数 *注：如果不需要保存文件或者不需要处理文件等参数，可以直接向 formData 中append
							console.log( "\t" + _f + ".<value> ".green + _part.fieldname.underline + ": " + _part.value );
							_transferFormData.append( _part.fieldname, _part.value );
							console.log( "\t" + _f + ".saved".underline + ( " " + _part.value ).green );
						}
						_f ++;
						console.log( "" );
					}
					resolve();			// 没有这句则只执行到 for 循环全部结束
				} catch ( e ) {
					console.log( '\t---------------------------------------------------------------------'.red.inverse );
					console.log( '\tFST_INVALID_MULTIPART_CONTENT_TYPE'.red );
				}
			});
		}, _getPartsFail => {});
		
		let convertFormat = saveParts.then( _saveAllArgsComplete => {			// 修正文件数据格式: 如 .webp ===================================================================================
			console.log("\tParts saved successfully".red);
			return new Promise( async ( resolve, reject ) => {
				if ( _files.length > 0 ) {
					for ( let _i = 0; _i < _files.length; _i ++ ) {				// 转换后台无法处理的图片格式到 jpg 格式
						if ( _files[ _i ][ "realMime" ] == "image/webp" ) {
							let _newPathName = path.resolve( _files[ _i ][ "realPathName" ].replace( _files[ _i ][ "realExt" ], '.jpg') );
							console.log( "\tConvert image format ...".underline );
							await convertToJpg( _files[ _i ][ "realPathName" ], _newPathName );		// 转换图像到 jpg 格式（ Promise ）
							_files[ _i ][ "realPathName" ] = _newPathName;
							break;				// 限制只处理第一张图片
						} else if ( _files[ _i ][ "realMime" ].substr( 0, 5 ) == "image" || _files[ _i ][ "realMime" ].substr( 0, 5 ) == "mage/") {
							break;				// 监测到不需要转换格式的图片文件，则跳出；
						} else {
							continue;			// 非图片格式文件，跳过
						}
					}
				}
				resolve();
			});
		}, _saveAllArgsError => {});
		
		let resizeImage = convertFormat.then( _convertFormatSuccess => {		// 修正文件尺寸 =================================================================================================
		// let resizeImage = saveParts.then( _convertFormatSuccess => {			// 修正文件尺寸 =================================================================================================
			console.log("\tConvert Format successfully".red);
			return new Promise( async ( resolve, reject ) => {
				if ( _files.length > 0 ) {
					for ( let _i = 0; _i < _files.length; _i ++ ) {				// 判断图片尺寸
						console.log( "\tFormat:" + _files[ _i ][ "realMime" ].substr( 0, 5 ).cyan );
						if ( _files[ _i ][ "realMime" ].substr( 0, 5 ) == "image" || _files[ _i ][ "realMime" ].substr( 0, 5 ) == "mage/") {
							console.log( "\t" + _files[ _i ][ "realPathName" ].underline );
							await new Promise( ( resolve, reject ) => {			// 此处必须有 await，否则仍然是并发保存
								sizeOf( _files[ _i ][ "realPathName" ], ( err, dimensions ) => {
									console.log( "\t" + ( _i + 1 ) + ".get image size:".underline, dimensions.width, dimensions.height );
									_files[ _i ][ "width" ] = dimensions.width;
									_files[ _i ][ "height" ] = dimensions.height;
									resolve();
								});
							})
							.then( async _sizeOfComplete => {
								if ( _files[ _i ][ "width" ] <= iniResult[ "maxSideLength" ] && _files[ _i ][ "height" ] <= iniResult[ "maxSideLength" ] ) {
									// break;
								} else {
									let _extname = path.extname( _files[ _i ][ "realPathName" ] );
									let _newPathName = path.resolve( _files[ _i ][ "realPathName" ].replace( _extname, "-resize" + _extname ) );
									let _width = 0;
									let _height = 0;
									// console.log( _files[ _i ][ "width" ], _files[ _i ][ "height" ] );
									if ( _files[ _i ][ "width" ] > _files[ _i ][ "height" ] ) {
										_width = iniResult[ "maxSideLength" ];
										_height = Math.round( iniResult[ "maxSideLength" ] * _files[ _i ][ "height" ] / _files[ _i ][ "width" ] );
									} else {
										_height = iniResult[ "maxSideLength" ];
										_width = Math.round( iniResult[ "maxSideLength" ] * _files[ _i ][ "width" ] / _files[ _i ][ "height" ] );
									}
									// console.log( "\tResize image ...".underline, _files[ _i ][ "realPathName" ], _newPathName.cyan, _files[ _i ][ "realExt" ].red, ( "-resize" + _files[ _i ][ "realExt" ] ).green, _width, _height );
									await imageResize( _files[ _i ][ "realPathName" ], _newPathName, _width, _height );		// 转换图像到 jpg 格式（ Promise ）
									_files[ _i ][ "realPathName" ] = _newPathName;
									// break;				// 限制只处理第一张图片
								}
								// break;
							}, _sizeOfError => {
							});
							break;
						} else {
							continue;			// 非图片格式文件，跳过
						}
					}
				}
				resolve();
			});
		}, _convertFormatError => {});
		
		// let transferPost = convertFormat.then( async _convertFormatSuccess => {					// 向后台发送请求
		let transferPost = resizeImage.then( async _resizeSuccess => {								// 向后台发送请求
			console.log("\tResize image successfully".red);
			if ( _files.length > 0 ) {
				for ( let _j = 0; _j < _files.length; _j++ ) {
					if ( _files[ _j ][ "realMime" ].substr( 0, 6 ) == "image/" ) {
						try {
							console.log( "\t" + _files[ _j ][ "realPathName" ].underline + "\n\tStart appending...".red  );
							_transferFormData.append( 'file', fs.createReadStream( _files[ _j ][ "realPathName" ] ) );
							break;
						} catch ( e ) {
							console.log( e );
						}
					}
				}
			}
			let _timeoutPms = [			// 创建 Promise 数组用于设置后台请求超时控制；
				new Promise( ( resolve, reject ) => {
					let _query = stringify( req.query );
					const _transferRequest = http.request(			// import { request } from 'http';	// 创建一个 'http.request' 对象 【流？】
						{
							host: proxyHost,
							port: proxyPort,
							path: proxyRoute + ( _query == '' ? '' : ( "?" + _query ) ),
							method: 'POST',
							headers: _transferFormData.getHeaders(),
						},
						( res ) => {
							resolve( res );
						}
					);
					_transferFormData.on( 'end', () => {		// 'finish'
						console.log( "\tAppend pipe end".red );
					});
					console.log( "\tTransfering...".underline );
					_transferFormData.on( 'error', ( e ) => { handlePipeError( e, "\t5.1 pipe @post local..." ) } ).pipe( _transferRequest ).on( 'error', ( e ) => { handlePipeError( e, "\t5.2 pipe @post URL..." ) } );			// 向 AI 后端发送 POST 图像数据：把 _transferFormData 流通过管道(pipe)流向 reqRroxy 流
				}),
				new Promise( ( resolve, reject ) => {
					setTimeout( () => {
						reject( "Time out !!!" );
					}, iniResult[ "maxTimeout" ] || 5000 );
				})
			];
			return Promise.race( _timeoutPms );
		});
		
		transferPost.then( res_value => {		// 接收到后台返回的数据
			// res_value.writeHead( 200, {'Content-Type': 'text/json;charset=utf-8','Access-Control-Allow-Origin':'*'} );
			// res_value.setHeader( 'Access-Control-Allow-Origin', '*' );
			if ( debug ) { console.log( "\t Response ".grey.inverse + " <-- @" + funcs.now().magenta ); }
			res_value.on( "end", () => {
				if ( debug ) { console.log( "\tRes.end - " + "End of receiving response data.".bBlue ); }
				console.log( '\t---------------------------------------------------------------------'.grey );	// 灰色分割线
				if ( global.rl )
				{
					rl.setPrompt( defaultPrompt );
					rl.prompt();
				}
			} );
			if ( showResponse ) {
				if ( debug ) {
					console.log( "\tRes - " + "Code: ".bBlue, res_value.statusCode );				// funcs.printObject( res, 1, "\t" );
				}
			}
			reply.send( res_value );
		}, timeout => {				// 超时处理
			console.log( ( "\tURL Error: " + timeout ).red );
			reply.send( { "statusCode":406, "version":"0.0.1", "code":"FST_INVALID_MULTIPART_CONTENT_TYPE", "method":"POST", "time":funcs.now(), "error":"Not Acceptable", "message": "the request is not multipart" } );
			if ( global.rl )
			{
				rl.setPrompt( defaultPrompt );
				rl.prompt();
			}
		})
		.catch ( error => {
			// console.log(  );
		});
	});
	// [ POST ] ================================================================================================================================================
	console.log( "[ " + "OK".green.inverse + " ]" + ( " Transfer '" + "POST".cyan.inverse + "' service is registered to 'fastify'." ).bBlue );
	console.log( "\tServer Route\t: " + ( "'" + serverRoute + "'" ).green );
	console.log( "\tProxy Host\t: " + proxyHost.bBlue );
	console.log( "\tProxy Port\t: " + ( proxyPort + '' ).yellow );
	console.log( "\tProxy Route\t: " + ( "'" + proxyRoute + "'" ).green );
}
// module.exports = proxy;		//routes
