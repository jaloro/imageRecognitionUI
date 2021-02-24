// Require the framework and instantiate it
// const fastifyStatic = require('fastify-static');
const fastify = require('fastify')({
	logger: false
})
const path = require('path');

// Health check route
// fastify.get('/', async ( request, options, reply ) => {
// 	console.log( '\x1b[96m%s\x1b[0m', "GET --> '/'" )
// 	return { "version" : "0.0.1" }
// });
// fastify.get( '/', serveStatic( path.resolve(__dirname, 'public') ) );
// Single path
// fastify.use('/css', serveStatic(path.join(__dirname, '/assets')))
// fastify.use( '/', serveStatic( path.join(__dirname, 'public') ) );

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default '/'
})

// Register rountes
fastify.register(require('./routes/transfer.js'));

// Run the server!
const start = async () => {
	try {
		console.log( '==========================================================' );
		var serverPort = 3000;
		await fastify.listen(process.env.PORT || serverPort, '0.0.0.0');
		fastify.log.info(`server listening on ${fastify.server.address().port}`);
		console.log( '\x1b[96m%s\x1b[0m', "Server Port:", serverPort );
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}
start();
