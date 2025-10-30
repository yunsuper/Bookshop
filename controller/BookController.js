const ensureAuthorization = require("../auth"); // 인증 모듈
const jwt = require("jsonwebtoken");
const conn = require("../mariadb");
const { StatusCodes } = require("http-status-codes"); //status code 모듈

// (카테고리별, 신간 여부) 전체 도서 목록 조회
const allBooks = (req, res) => {
    let allBooksRes = {};
    let { category_id, news, limit, currentPage } = req.query;

    // limit : page 당 도서 수     ex. 3
    // currentPage : 현재 몇 페이지 ex. 1, 2, 3 ...
    // offset :                     0, 3, 6, 9 ,12 ...
    //                              limit * (currentPage-1)
    let offset = limit * (currentPage - 1);

    let sql =
        "SELECT SQL_CALC_FOUND_ROWS *, (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes FROM books";
    let values = [];
    if (category_id && news) {
        // 순서중요! 1. 카테고리id와 신간이면
        sql +=
            " WHERE category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
        values = [category_id];
    } else if (category_id) {
        // 2. 카테고리id만
        sql += " WHERE category_id = ? ";
        values = [category_id];
    } else if (news) {
        // 3. 신간만
        sql +=
            " WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
    }

    sql += ` LIMIT ? OFFSET ?; SELECT found_rows()`;
    values.push(parseInt(limit));
    values.push(offset);

    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }
        console.log(results);
        if (results.length) { 
            allBooksRes.books = results[0]; // 첫번째 SELECT 결과
            let totalCount = results[1][0]["found_rows()"]; //두번째 SELECT 결과 [1]은 [] 배열, [0]은 객체 {} 따라서 totalCount에 속성을 빼주려면 같이 써야함(객체에 접근하기 위해서), DB에서 넘어오는 key 이름 그대로 문자열로 (컬럼 이름이라서)
            let pagination = {};
            pagination.currentPage = parseInt(currentPage);
            pagination.totalCount = totalCount;    

            allBooksRes.pagination = pagination;
            
            return res.status(StatusCodes.OK).json(allBooksRes);
        } else return res.status(StatusCodes.NOT_FOUND).end();
    });
};

// 개별 도서 조회
const bookDetail = (req, res) => {
    let book_id = req.params.id;
    let authorization = ensureAuthorization(req, res);

    if (authorization instanceof jwt.TokenExpiredError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
        });
    }
    if (authorization instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "잘못된 토큰입니다.",
        });
    }

    let sql = `SELECT *, (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes`;
    let values = []; // 처음에는 로그인 했는지 안했는지 모르므로 빈배열로 시작

    if (!(authorization instanceof ReferenceError)) {
        //로그인 상태이면 => liked 추가해서
        sql += `, (SELECT EXISTS(SELECT * FROM likes WHERE user_id = ? AND liked_book_id = ?)) AS liked`;
        values.push(authorization.id, book_id);
    }
    // 로그인 상태가 아니면 => liked 빼고 보내주면 되고
    sql += ` FROM books LEFT JOIN category 
            ON books.category_id = category.category_id
            WHERE books.id = ?`;
    values.push(book_id);

    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        if (results[0]) return res.status(StatusCodes.OK).json(results[0]);
        else return res.status(StatusCodes.NOT_FOUND).end();
    });
}


module.exports = {
    allBooks,
    bookDetail,
};
