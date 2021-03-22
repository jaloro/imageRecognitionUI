global.colors = require('colors');	// 加载控制台色彩模块

// 配置配色方案
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'red',
    info: 'green',
    data: 'blue',
    help: 'cyan',
    warn: 'yellow',
    debug: 'magenta',
    error: 'red',
	
	black: 'black',
	blue: 'blue',
	cyan: 'cyan',
	gray: 'gray',
	green: 'green',
	grey: 'grey',
	magenta: 'magenta',
	red: 'red',
	white: 'white',
	yellow: 'yellow',
	
	bBlue: 'brightBlue',
	bCyan: 'brightCyan',
	bGreen: 'brightGreen',
	bMagenta: 'brightMagenta',
	bRed: 'brightRed',
	bWhite: 'brightWhite',
	bYellow: 'brightYellow',
	
	reset: 'reset',
	bold: 'bold',
	dim: 'dim',
	italic: 'italic',
	underline: 'underline',
	inverse: 'inverse',
	hidden: 'hidden',
	strikethrough: 'strikethrough',
	
	bgBlack: 'bgBlack',
	bgRed: 'bgBlack',
	bgGreen: 'bgBlack',
	bgYellow: 'bgBlack',
	bgBlue: 'bgBlack',
	bgMagenta: 'bgBlack',
	bgCyan: 'bgBlack',
	bgWhite: 'bgBlack',
	bgGray: 'bgBlack',
	bgGrey: 'bgBlack',
	
	bgbRed: 'bgBrightRed',
	bgbGreen: 'bgBrightGreen',
	bgbYellow: 'bgBrightYellow',
	bgbBlue: 'bgBrightBlue',
	bgbMagenta: 'bgBrightMagenta',
	bgbCyan: 'bgBrightCyan',
	bgbWhite: 'bgBrightWhite',
	
	rainbow: 'rainbow',
	zebra: 'zebra',
	america: 'america',
	trap: 'trap',
	random: 'random',
	
	custom: [ 'inverse', 'cyan', 'italic' ]
});

// console.log( "["+"OK".green.inverse+"]" + " 'colors' module loaded successfully.".cyan );
// console.log( ( "\tEnter the '" + "help".white.inverse + "' command to get the command list." ) );