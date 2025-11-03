const ensureAuthorization = require("../auth"); // 인증 모듈
const jwt = require("jsonwebtoken");
const mariadb = require("mysql2/promise");
const { StatusCodes } = require("http-status-codes");

// 주문하기
const order = async (req, res) => {
    const conn = await mariadb.createConnection({
        host: "localhost",
        user: "root",
        password: "root",
        database: "Bookshop",
        dateStrings: true,
    });

    let authorization = ensureAuthorization(req, res);

    if (authorization instanceof jwt.TokenExpiredError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
        });
    };
    if (authorization instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "잘못된 토큰입니다.",
        });
    };
    if (authorization instanceof ReferenceError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "로그인 후 주문이 가능합니다.",
        });
    };
    const {
        items,
        delivery,
        totalQuantity,
        totalPrice,
        firstBookTitle,
    } = req.body;

    // delivery 테이블 삽입
    let sql =
        "INSERT INTO delivery (address, receiver, contact) VALUES (?, ?, ?)";
    let values = [delivery.address, delivery.receiver, delivery.contact];
    let [results1] = await conn.execute(sql, values);
    let delivery_id = results1.insertId;

    // orders 테이블 삽입
    sql = `INSERT INTO orders (book_title, total_quantity, total_price, user_id, delivery_id) VALUES (?, ?, ?, ?, ?)`;
    values = [firstBookTitle, totalQuantity, totalPrice, authorization.id, delivery_id];
    let [results2] = await conn.execute(sql, values);
    let order_id = results2.insertId;

    // items를 가지고, 장바구니에서 book_id, quantity 조회
    sql = `SELECT book_id, quantity FROM cartItems WHERE id IN (?)`;
    let [orderItems, fields] = await conn.query(sql, [items]);

    // orderedBook 테이블 삽입
    sql = `INSERT INTO orderedBook (order_id, book_id, quantity) VALUES ?`;

    // items..배열: 요소들을 하나씩 꺼내서 (foreach문 돌려서) >
    values = [];
    orderItems.forEach((item) => {
        values.push([order_id, item.book_id, item.quantity]);
    });

    if (orderItems.length === 0)
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "장바구니에서 가져올 책이 없습니다.",
        });

    results = await conn.query(sql, [values]);

    let result = await deleteCartItems(conn, items);

    orderItems.map((item) => {
        item.bookId = item.book_id;
        delete item.book_id;
    });

    return res.status(StatusCodes.OK).json({
        items: orderItems,
        delivery,
        totalQuantity,
        totalPrice,
        firstBookTitle
    });
};


// 주문/결제 insert 넘어가면서 장바구니에서 선택되서 넘어온 책들 삭제
const deleteCartItems = async (conn, items) => { 
    let sql = `DELETE FROM cartItems WHERE id IN (?)`;

    let result = await conn.query(sql, [items]);
    return result;
};

// 주문 목록 조회
const getOrders = async (req, res) => {
    const conn = await mariadb.createConnection({
        host: "localhost",
        user: "root",
        password: "root",
        database: "Bookshop",
        dateStrings: true,
    });

     let authorization = ensureAuthorization(req, res);

    if (authorization instanceof jwt.TokenExpiredError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
        });
    } else if (authorization instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "잘못된 토큰입니다.",
        });
    } else {
        let sql = `SELECT orders.id, created_at, address, receiver, contact, 
                    book_title, total_quantity, total_price                  
                    FROM orders LEFT JOIN delivery
                    ON orders.delivery_id = delivery.id WHERE orders.user_id = ?;`;
        let [rows, fields] = await conn.query(sql, [authorization.id]);

        rows.map(function (row) {
            row.bookTitle = row.book_title;
            delete row.book_title;

            row.createdAt = row.created_at;
            delete row.created_at;

            row.totalQuantity = row.total_quantity;
            delete row.total_quantity;

            row.totalPrice = row.total_price;
            delete row.total_price;
        });

        return res.status(StatusCodes.OK).json(rows);
    }
};

//주문 상세 상품 조회
const getOrderDetail = async (req, res) => {
    const orderId = req.params.id;
    const conn = await mariadb.createConnection({
        host: "localhost",
        user: "root",
        password: "root",
        database: "Bookshop",
        dateStrings: true,
    });

    let authorization = ensureAuthorization(req, res);

    if (authorization instanceof jwt.TokenExpiredError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
        });
    } else if (authorization instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "잘못된 토큰입니다.",
        });
    } else {
        let sql = `SELECT book_id, title, author, price, quantity                 
                    FROM orderedBook LEFT JOIN books
                    ON orderedBook.book_id = books.id
                    LEFT JOIN orders
                    ON orderedBook.order_id = orders.id
                    WHERE order_id = ? AND orders.user_id = ?;`;
        let [rows, fields] = await conn.query(sql, [orderId, authorization.id]);

        rows.map(function (row) {
            row.bookId = row.book_id;
            delete row.book_id;
        });

        return res.status(StatusCodes.OK).json(rows);
    }
};

module.exports = {
    order,
    getOrders,
    getOrderDetail,
};
