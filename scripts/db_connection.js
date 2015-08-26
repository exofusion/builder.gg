var local_mongo = 'mongodb://localhost/riotchallenge';
exports.connection_string = process.env.MONGOLAB_URI || local_mongo;