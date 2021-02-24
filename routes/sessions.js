
const mongoConfig = require('../conf/mongo.json');
const MongoSessionClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

var db;
MongoSessionClient.connect(mongoConfig.mongoSessionUrl, function(err, database){
  if (err) throw err;
  db = database;
  console.log ("mongo db " + mongoConfig.mongoSessionUrl + " connected")
})

module.exports = function (fastify, opts, next) {
  fastify.post('/createSession', (req,reply) =>{
    let dbo = db.db(mongoConfig.liveSessionDB);
    dbo.collection(mongoConfig.liveSessionCollection).insertOne({name: "test"}, function (err, res){
      if (err) {
        reply.code(500);
        reply.send({"Error" : err})
      }
      let sId = res.insertedId + "";
      console.log("databaseName : " + dbo.databaseName);
      dbo.createCollection(sId, function(err, res){
        if (err) throw err;
        reply.send( { "sId": sId })
      });
    });
  })

  fastify.get('/test', (req, reply) => {
    reply.send({ route: 'test' })
  })

  fastify.post('/test', (req,reply) => {
    reply.send({"requestData" : req.body});
  })

  fastify.post("/step", (req, reply) => {
    //validation
    let dbo = db.db(mongoConfig.liveSessionDB);
    dbo.listCollections({name : req.body.sId}, {"nameOnly" : true}).toArray(function(err, collections){
      if (err) {
        reply.code(500);
        reply.send({"Error" : err});
      } else {
        if (collections.length == 0) {
          reply.code(500);
          reply.send({"Error" : "session Id " + req.body.sId + " not found"});
        } else {
          // add step into session
          if (req.body.previousState){
            dbo.collection(req.body.sId).insertOne({"state" : req.body.previousState, "step" : req.body.step});
          }
          // retrieve and return next step
          dbo.collection(mongoConfig.mainCollection).findOne({"state" : req.body.state}, function (err, result){
            if (err) {
              reply.code(500);
              reply.send({"Error" : err})
            }
            if (result == null) {
              result = {};
            }
            reply.send(result);
          })
        }
      }
    })
  })

  fastify.post("/result", (req,reply) =>{
      let dbo = db.db(mongoConfig.liveSessionDB);

      dbo.listCollections({name : req.body.sId}, {"nameOnly" : true}).toArray(function(err, collections){
        if (err) {
          reply.code(500);
          reply.send({"Error" : err});
        } else {
          if (collections.length == 0) {
            reply.code(500);
            reply.send({"Error" : "session Id " + req.body.sId + " not found"});
          } else {
            dbo.collection(req.body.sId).find({}).toArray(function (err, steps){
              if (err){
                reply.code(500);
                reply.send({"Error" : err})
              } else {
                steps.forEach(function(step){
                  // update result db
                  let state = JSON.stringify(step.state).replace(/"/g,"");
                  let nextStep = JSON.stringify(step.step);
                  let fieldName = nextStep + "." + req.body.result
                  let incSpec = {};
                  incSpec[fieldName] = 1;
                  dbo.collection(mongoConfig.mainCollection).updateOne(
                    {"state" : state}, 
                    {$inc : incSpec},
                    {upsert: true}
                  )
                })

                // delete session data
                dbo.collection(req.body.sId).drop(function(err, delOK){
                  if (err) {
                    reply.code(500);
                    reply.send({"Error when droping session " : err})
                  }
                  if (delOK) console.log("Deleting sesssion " + req.body.sId);
                })

                // delete session from liveSessions
                dbo.collection(mongoConfig.liveSessionCollection).remove({"_id" : ObjectID(req.body.sId)})

                // send response
                reply.send({"session" : req.body, "steps": steps.length});
              }
            })
          }
        }
      })
  })
  next()
}
