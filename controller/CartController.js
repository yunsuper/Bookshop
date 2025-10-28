const conn = require("../mariadb");
const { StatusCodes } = require("http-status-codes");

// 장바구니 담기
const addToCart = (req, res) => {
    const { book_id, quantity, user_id } = req.body;

    let sql =
        "INSERT INTO cartItems (book_id, quantity, user_id) VALUES (?, ?, ?)";
    values = [book_id, quantity, user_id];
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        return res.status(StatusCodes.OK).json(results);
    });
};

// 장바구니 아이템 목록 조회 / 선택된 장바구니 아이템 목록 조회
const getCartItems = (req, res) => {
    const { user_id, selected } = req.body; //selected = [1, 3]

    let sql = `SELECT cartItems.id, book_id, title, summary, quantity, price 
            FROM cartItems LEFT JOIN books
            ON cartItems.book_id = books.id
            WHERE user_id=? AND cartItems.id IN (?)`;
    
    let values = [user_id, selected];
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        return res.status(StatusCodes.OK).json(results);
    });
};

// 장바구니 도서 하나씩 삭제라서 단수형으로 
const removeCartItem = (req, res) => {
    const { id } = req.params; //cartItemId

    let sql = "DELETE FROM cartItems WHERE id = ?";
    conn.query(sql, id, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        return res.status(StatusCodes.OK).json(results);
    });

};

module.exports = {
    addToCart,
    getCartItems,
    removeCartItem
};