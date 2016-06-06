var local_mongo = 'mongodb://localhost/riotchallenge';
exports.connection_string = process.env.MONGODB_URI || local_mongo;