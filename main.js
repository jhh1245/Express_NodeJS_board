const express = require('express') //모듈을 가져와서 express라는 이름을 붙임(상수, 앞으로 이름이 바뀌지 않는다)
const app = express() //express는 함수고, 리턴된 값을 app에 담는다
const port = 3000
const fs = require('fs');
const template = require('./lib/template.js'); //내가 만든 모듈 
const path = require('path'); // URL에서 ../ 이렇게 들어오면 내 컴퓨터 파일 볼 수 있는 문제 -> 보안을 위해서 모듈 추가
const sanitizeHtml = require('sanitize-html'); //입력 폼에서 <script>테그 등 입력해서 조작하지 않도록 하기 위해서 살균을 진행함 
//실제 파일로는 <script>가 있지만, 페이지소스보기를 하면 안보임 (살균됨)
const qs = require('querystring');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const db = mysql.createConnection({ //커넥션을 생성 
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'opentutorials'
});

db.connect(); // 실제 접속이 들어감

app.use(express.static(path.join(__dirname, 'css')))
app.use(bodyParser.urlencoded({ extended: false }));
// bodyParser가 실행되면서 그 결과로 미들웨어가 들어오게됨 bodyParser.urlencoded({extended: false}) 부분에 
// main.js 실행될때 마다, 사용자가 요청할때 마다 위 코드로 인해 만들어진 미들웨어가 실행됨 
//내부적으로 사용자가 전달한 post 데이터를 분석해서 create_process 콜백을 호출하도록 약속됨 
// app.post('/create_process', function (request, response) { --> 여기에서 request 변수에 body 프로퍼티를 만들어줌 (body parser가)

app.get('/', (request, response) => { //경로, 접속자가 들어왔을 때 호출될 함수 
    /*fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
        //console.log(filelist);
        let title = 'Welcome';
        let description = 'Hello, Node.js';
        let list = template.list(filelist);
        let html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`
        ); // 이 부분을 함수로 만듦 

        response.send(html);
    })
    */
    db.query(`SELECT * FROM topic`, function (error, topics) { //에러일 경우 에러 정보를, 정상동작했을 땐 sql결과가 담김
        //console.log(topics);

        const title = 'Welcome';
        const description = 'Hello, Node.js';
        const list = template.list(topics);
        const html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`
        );
        response.writeHead(200);
        response.end(html);
    });
})

app.get('/page/:pageId', function (request, response) { //* URL 패스방식으로 파라미터 처리하는 라우팅 기법 살펴봄
    /*fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
        //console.log(filelist);
        let filteredId = path.parse(request.params.pageId).base // *쿼리스트링을 사용하지 않으니 변경
        // 아래 readFile 외부에서 들어오는 경로를 의심해봐야함 
        fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) { //그래서여기서 URL에 ../이렇게 들어와도 세탁됨 -> undefined 가 뜬다
            let title = request.params.pageId;
            let sanitizedTitle = sanitizeHtml(title); // 이후로는 살균된 타이틀, 설명 변수를 사용
            let sanitizedDescription = sanitizeHtml(description);
            let list = template.list(filelist);
            let html = template.HTML(sanitizedTitle, list,
                // delete버튼 : 반드시 메소드를 포스트로 보내야한다. get으로 하면 url만 입력하면 글이 삭제되니까
                // ***여기서 링크를 만들어주는 부분에 /update/?id= 이 부분을 /update/로 수정함
                `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
                `<a href="/create">create</a>
                <a href="/update/${sanitizedTitle}">update</a>
                <form action="/delete_process" method="post"> 
                    <input type="hidden" name="id" value="${sanitizedTitle}">
                    <input type="submit" value="delete">
                </form>`
            ); // 이 부분을 함수로 만듦 
            response.send(html);
        });
    });*/
    const filteredId = path.parse(request.params.pageId).base // *쿼리스트링을 사용하지 않으니 변경
    //글 목록 가져옴 
    db.query(`SELECT * FROM topic`, function (error, topics) {
        if (error) {
            throw error;
        }


        db.query(`SELECT * FROM topic LEFT JOIN author ON topic.author_id=author.id WHERE topic.id=?`, [filteredId], function (error2, topic) {
            if (error2) {
                throw error2;
            }
            //console.log(topic);

            const title = topic[0].title;
            const description = topic[0].description;
            const list = template.list(topics);
            const html = template.HTML(title, list,
                `<h2>${title}</h2>
                ${description}
                <p>by ${topic[0].name}</p>`,
                `<a href="/create">create</a>
                <a href="/update/${filteredId}">update</a>
                    <form action="/delete_process" method="post"> 
                        <input type="hidden" name="id" value="${filteredId}">
                        <input type="submit" value="delete">
                    </form>`
            );
            response.writeHead(200);
            response.end(html);
        });
    });
});

app.get('/create', function (request, response) { //* URL 패스방식으로 파라미터 처리하는 라우팅 기법 살펴봄
    /*fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
        //console.log(filelist);
        let title = 'Web - create';
        let list = template.list(filelist);
        let html = template.HTML(title, list, `
        <form action="/create_process" method="post">
            <p><input type="text" name="title" placeholder="title"></p>
            <p>
                <textarea name="description" placeholder="description"></textarea>
            </p>
            <p>
                <input type="submit">
            </p>
            </form>
    `, '');
        response.send(html);
    });*/
    db.query(`SELECT * FROM topic`, function (error, topics) {
        db.query(`SELECT * FROM author`, function (error2, authors) {
            const title = 'Create';
            const list = template.list(topics);
            const html = template.HTML(title, list,
                `
              <form action="/create_process" method="post">
                <p><input type="text" name="title" placeholder="title"></p>
                <p>
                  <textarea name="description" placeholder="description"></textarea>
                </p>
                <p>
                    ${template.authorSelect(authors)}
                </p>
                <p>
                  <input type="submit">
                </p>
              </form>
              `,
                `<a href="/create">create</a>`
            );
            response.writeHead(200);
            response.end(html);
        })

    });
});

app.post('/create_process', function (request, response) { //* post방식이니까 앞에 app.post
    /* 
    let body = '';
    request.on('data', function (data) { //웹 브라우저가 포스트 방식으로 데이터 전송할때 
        body = body + data; //콜백 실행될때마다 data를 추가함
    })//사용자가 요청한 정보안에 포스트 정보가 있기 때문에 request.이라고 함 
    request.on('end', function () { //더이상 데이터 안들어오면 end에 해당되는 콜백함수 부르도록 약속 
        let post = qs.parse(body); //parse함수에 지금까지 저장한 body를 post값에 넣는다? 
        //쿼리스트링이라는 모듈의 parse함수를 이용해 정보를 객체화 할 수 있음
        let title = post.title;
        let description = post.description;
        fs.writeFile(`data/${title}`, description, 'utf8',
            function (err) { // 콜백 실행 = 파일 저장끝남
                response.writeHead(302, { Location: `/?id=${title}` }); //다른페이지로 리다이렉트 시켜라
                response.end();
            });
    });
    */
    const post = request.body; // * qs.parse(body) --> request.body로 변경함 (body parser 사용하니까)
    const title = post.title;
    const description = post.description;
    /*fs.writeFile(`data/${title}`, description, 'utf8',
        function (err) { // 콜백 실행 = 파일 저장끝남
            response.writeHead(302, { Location: `/?id=${title}` }); //다른페이지로 리다이렉트 시켜라
            response.end();
        });*/
    db.query(`
            INSERT INTO topic (title, description, created, author_id) 
              VALUES(?, ?, NOW(), ?)`,
        [post.title, post.description, post.author],
        function (error, result) {
            if (error) {
                throw error;
            }
            response.writeHead(302, { Location: `/?id=${result.insertId}` });
            response.end();
        }
    )
});


app.get('/update/:pageId', function (request, response) { // ** 위에 /page/:pageId에서 링크를 만들어줄 때 id를 넣어줬으니까 여기도 update/:pageid
    /*fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
        //console.log(filelist);
        let filteredId = path.parse(request.params.pageId).base // 이곳도 
        fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
            let title = request.params.pageId;
            let list = template.list(filelist);
            let html = template.HTML(title, list, //어디로 보낼것이냐 = action에 입력 
                //사용자가 글 제목 수정하면, 그 제목은 파일목록에 없으니 찾을 수 없으니 기존 데이터, 수정 데이터 식별 가능해야됨 => 그래서 hidden 씀
                // id는 기존 글 이름, title은 바뀐값이 간다. 
                `
            <form action="/update_process" method="post">
            <input type="hidden" name="id" value="${title}">
                <p><input type="text" name="title" value="${title}"></p>
                <p>
                    <textarea name="description">${description}</textarea>
                </p>
                <p>
                    <input type="submit">
                </p>
                </form>
        `,
                `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
            ); // 이 부분을 함수로 만듦 
            response.send(html);
        });
    });*/
    const filteredId = path.parse(request.params.pageId).base
    db.query('SELECT * FROM topic', function (error, topics) {
        if (error) {
            throw error;
        }

        db.query(`SELECT * FROM topic WHERE id=?`, [filteredId], function (error2, topic) {
            if (error2) {
                throw error2;
            }
            db.query(`SELECT * FROM author`, function (error2, authors) {
                const list = template.list(topics);
                const html = template.HTML(topic[0].title, list,
                    `
                <form action="/update_process" method="post">
                  <input type="hidden" name="id" value="${topic[0].id}">
                  <p><input type="text" name="title" placeholder="title" value="${topic[0].title}"></p>
                  <p>
                    <textarea name="description" placeholder="description">${topic[0].description}</textarea>
                  </p>
                  <p>
                    ${template.authorSelect(authors, topic[0].author_id)}
                  </p>
                  <p>
                    <input type="submit">
                  </p>
                </form>
                `,
                    `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`
                );
                response.writeHead(200);
                response.end(html);
            });

        });
    });
});

app.post('/update_process', function (request, response) {
    const post = request.body;
    const id = post.id; //id값을 추가. 어떤 게시글을 수정할건지 알아야 해서
    const title = post.title;
    const description = post.description;

    /*fs.rename(`data/${id}`, `data/${title}`, function (error) { //파일 명 변경! 
        fs.writeFile(`data/${title}`, description, 'utf8', //수정된 파일명에, description을 수정하고, 수정게시글로 이동함
            function (err) { // 콜백 실행 = 파일 저장끝남
                // response.writeHead(302, { Location: `/?id=${title}` });
                // response.end();
                response.redirect(`/?id=${title}`);
            });
    });*/
    db.query('UPDATE topic SET title=?, description=?, author_id=? WHERE id=?', [post.title, post.description, post.author, post.id], function (error, result) {
        response.writeHead(302, { Location: `/page/${post.id}` });
        response.end();
    })
    console.log(post);
});

app.post('/delete_process', function (request, response) {
    const post = request.body;
    const id = post.id; //id값을 추가. 어떤 게시글을 수정할건지 알아야 해서
    const filteredId = path.parse(id).base
    /*fs.unlink(`data/${filteredId}`, function (error) {

        // response.writeHead(302, { Location: `/` });
        // response.end();

        // ** express는 리다이렉션을 편리하게 하는 기능 있어서 아래처럼 수정
        response.redirect('/');
    })*/
    db.query('DELETE FROM topic WHERE id = ?', [post.id], function (error, result) {
        if (error) {
            throw error;
        }
        response.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

/*console.log('hello~~')

var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var path = require('path'); // URL에서 ../ 이렇게 들어오면 내 컴퓨터 파일 볼 수 있는 문제 -> 보안을 위해서 모듈 추가
var sanitizeHtml = require('sanitize-html'); //입력 폼에서 <script>테그 등 입력해서 조작하지 않도록 하기 위해서 살균을 진행함 
//실제 파일로는 <script>가 있지만, 페이지소스보기를 하면 안보임 (살균됨)

var template = require('./lib/template.js'); //내가 만든 모듈 

var app = http.createServer(function (request, response) {
    //createServer에 콜백함수를 노드 JS가 호출함, 리퀘스트 = 웹브라우저가 보낸 정보, 리스폰스 = 응답할때 웹 브라우저한테 전송할 데이터 
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    //console.log(pathname);

    if (pathname === '/') {
        if (queryData.id === undefined) { //정의 되지 않은 데이터 undefined
            fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
                //console.log(filelist);
                var title = 'Welcome';
                var description = 'Hello, Node.js';
                //  함수로 만들었던걸 -> 객체로 바꿨으니까 아래처럼 수정 template.list
                // var list = templateList(filelist);
                // var template = templateHTML(title, list,
                //     `<h2>${title}</h2>${description}`,
                //     `<a href="/create">create</a>`
                // ); // 이 부분을 함수로 만듦 
                
                var list = template.list(filelist);
                var html = template.HTML(title, list,
                    `<h2>${title}</h2>${description}`,
                    `<a href="/create">create</a>`
                ); // 이 부분을 함수로 만듦 

                response.writeHead(200); // 성공적으로 파일을 전달함 
                response.end(html);
            });
        }
        else { // undefined가 아니라면 = id 값이 있는 경우
            fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
                //console.log(filelist);
                var filteredId = path.parse(queryData.id).base // 아래 readFile 외부에서 들어오는 경로를 의심해봐야함 
                fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) { //그래서여기서 URL에 ../이렇게 들어와도 세탁됨 -> undefined 가 뜬다
                    var title = queryData.id;
                    var sanitizedTitle = sanitizeHtml(title); // 이후로는 살균된 타이틀, 설명 변수를 사용
                    var sanitizedDescription = sanitizeHtml(description);
                    var list = template.list(filelist);
                    var html = template.HTML(sanitizedTitle, list,
                        // delete버튼 : 반드시 메소드를 포스트로 보내야한다. get으로 하면 url만 입력하면 글이 삭제되니까
                        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
                        `<a href="/create">create</a>
                        <a href="/update?id=${sanitizedTitle}">update</a>
                        <form action="delete_process" method="post"> 
                            <input type="hidden" name="id" value="${sanitizedTitle}">
                            <input type="submit" value="delete">
                        </form>`
                    ); // 이 부분을 함수로 만듦 
                    response.writeHead(200); // 성공적으로 파일을 전달함 
                    response.end(html);
                });
            });
        }
    } else if (pathname === '/create') {
        fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
            //console.log(filelist);
            var title = 'Web - create';
            var list = template.list(filelist);
            var html = template.HTML(title, list, `
                <form action="/create_process" method="post">
                    <p><input type="text" name="title" placeholder="title"></p>
                    <p>
                        <textarea name="description" placeholder="description"></textarea>
                    </p>
                    <p>
                        <input type="submit">
                    </p>
                    </form>
            `, '');
            response.writeHead(200); // 성공적으로 파일을 전달함 
            response.end(html);
        });
    } else if (pathname === '/create_process') {
        var body = '';
        request.on('data', function (data) { //웹 브라우저가 포스트 방식으로 데이터 전송할때 
            body = body + data; //콜백 실행될때마다 data를 추가함
        })//사용자가 요청한 정보안에 포스트 정보가 있기 때문에 request.이라고 함 
        request.on('end', function () { //더이상 데이터 안들어오면 end에 해당되는 콜백함수 부르도록 약속 
            var post = qs.parse(body); //parse함수에 지금까지 저장한 body를 post값에 넣는다? 
            //쿼리스트링이라는 모듈의 parse함수를 이용해 정보를 객체화 할 수 있음
            var title = post.title;
            var description = post.description;
            fs.writeFile(`data/${title}`, description, 'utf8',
                function (err) { // 콜백 실행 = 파일 저장끝남
                    response.writeHead(302, { Location: `/?id=${title}` }); //다른페이지로 리다이렉트 시켜라
                    response.end();
                });
        });
    } else if (pathname == '/update') {
        fs.readdir('./data', function (error, filelist) { //filelist는 data라는 디렉토리의 파일 목록을 가져옴
            //console.log(filelist);
            var filteredId = path.parse(queryData.id).base
            fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
                var title = queryData.id;
                var list = template.list(filelist);
                var html = template.HTML(title, list, //어디로 보낼것이냐 = action에 입력 
                    //사용자가 글 제목 수정하면, 그 제목은 파일목록에 없으니 찾을 수 없으니 기존 데이터, 수정 데이터 식별 가능해야됨 => 그래서 hidden 씀
                    // id는 기존 글 이름, title은 바뀐값이 간다. 
                    `
                    <form action="/update_process" method="post">
                    <input type="hidden" name="id" value="${title}">
                        <p><input type="text" name="title" value="${title}"></p>
                        <p>
                            <textarea name="description">${description}</textarea>
                        </p>
                        <p>
                            <input type="submit">
                        </p>
                        </form>
                `,
                    `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
                ); // 이 부분을 함수로 만듦 
                response.writeHead(200); // 성공적으로 파일을 전달함 
                response.end(html);
            });
        });
    } else if (pathname === '/update_process') {
        var body = '';
        request.on('data', function (data) {
            body = body + data;
        })
        request.on('end', function () {
            var post = qs.parse(body);
            var id = post.id; //id값을 추가. 어떤 게시글을 수정할건지 알아야 해서
            var title = post.title;
            var description = post.description;

            fs.rename(`data/${id}`, `data/${title}`, function (error) { //파일 명 변경! 
                fs.writeFile(`data/${title}`, description, 'utf8', //수정된 파일명에, description을 수정하고, 수정게시글로 이동함
                    function (err) { // 콜백 실행 = 파일 저장끝남
                        response.writeHead(302, { Location: `/?id=${title}` });
                        response.end();
                    });
            });
            console.log(post);
        });
    } else if (pathname === '/delete_process') {
        var body = '';
        request.on('data', function (data) {
            body = body + data;
        })
        request.on('end', function () {
            var post = qs.parse(body);
            var id = post.id; //id값을 추가. 어떤 게시글을 수정할건지 알아야 해서
            var filteredId = path.parse(id).base
            fs.unlink(`data/${filteredId}`, function (error) {
                response.writeHead(302, { Location: `/` });
                response.end();
            })
        });
    }

    else {
        response.writeHead(404); // 파일 찾을 수 없음 
        response.end('Not found');
    }
    //response.end(fs.readFileSync(__dirname + _url));
});
app.listen(3000);*/