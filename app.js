//ifconfig | grep iset

/**
 * Module dependencies.
 */

//モジュールの読み込み
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

//ここからサーバ設定のおまじない
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

//ここまではサーバ設定のおまじない

//サーバへの接続
var mysql = require('mysql');
var DB_NAME = 'chat';
var TABLE = 'messages';
//mysqlクライアント作成
var database = mysql.createClient({
  user: 'chat',
  password: 'chat'
});

//データベース選択
database.query('USE ' + DB_NAME);

/*
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
*/

//socket.ioで使うんでserverに入れる
var server = http.createServer(app).listen(app.get('port'), function(){
console.log("Express server listening on port " + app.get('port'));
});

var socket = require('socket.io').listen(server);
socket.on('connection', function(client) {
    
    //投稿したらメッセージを表示する処理
    client.on('message', function(event){
	// クライアントからのメッセージをコンソールに出力
	console.log(event.message);
	
	database.query(
	    //?を第二引数で置換する（プレースホルダー）
	    'INSERT INTO messages(text) values(?);',
	    [event.message],
	    function(err, info) {
		//console.log('info : '+ info);
		//console.log(err);
		if(!err){
		    // 送信元へメッセージ送信
		    client.emit('message', event.message);
		    // 送信元以外の全てのクライアントへメッセージ送信
		    client.broadcast.emit('message', event.message);
		}
	    }
	);
	
	
    });

    //deleteの処理
    client.on('delete', function(){
	database.query(
	    //tableを削除
	    'TRUNCATE TABLE messages;',
	    [],
	    function(err, del) {
		if(!err){
		    // 送信元へdeleteを指示
		    client.emit('delete', del);
		    // 送信元以外の全てのクライアントへdeleteを指示
		    client.broadcast.emit('delete', del);
		}
	    }
	);
    });

    //初回読み込み時にデータベースのメッセージを読み込み
    database.query(
	'select * from messages;',
	[],
	function(err, rows) {
	    if(!err){
	     //メッセージ送信
		client.emit('rows', rows);
	    }
	}
    );

});